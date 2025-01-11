// 获取最近200期双色球数据
async function getLotteryData() {
    try {
        console.log('正在请求API数据...');
        // 获取最新100期数据
        const response = await fetch('http://api.huiniao.top/interface/home/lotteryHistory?type=ssq&page=1&limit=100&code=');
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const data = await response.json();
        
        // 更严格的API响应检查
        if (!data?.data?.data?.list) {
            throw new Error('API返回数据格式错误');
        }
        
        // 获取最新100期数据
        const combinedData = data.data.data.list;
        console.log('实际获取数据量:', combinedData.length);

        // 转换数据格式，增加数据校验
        return combinedData.map(item => {
            if (!item?.code || !item?.day || !item?.one || !item?.two || !item?.three) {
                console.warn('无效数据项:', item);
                return null;
            }
            
            try {
                // 解析开奖时间
                const drawDate = new Date(item.day);
                const drawYear = drawDate.getFullYear().toString().slice(2);
                
                // 解析期号
                let drawNum = item.code;
                // 去掉前两位25，保留后7位
                if (drawNum.length === 9 && drawNum.startsWith('25')) {
                    drawNum = drawNum.slice(2);
                }
                // 确保期号为7位数字
                if (!/^\d{7}$/.test(drawNum)) {
                    throw new Error(`无效期号: ${drawNum}`);
                }
                
                // 组合开奖号码
                const red = [
                    item.one, 
                    item.two, 
                    item.three,
                    item.four,
                    item.five,
                    item.six
                ].sort((a, b) => a - b).join(',');

                return {
                    code: drawNum, // 直接使用处理后的7位期号
                    red: red,
                    blue: item.seven || '', // 修正蓝球号码字段
                    date: item.day
                };
            } catch (error) {
                console.error('数据转换错误:', error);
                return null;
            }
        }).filter(item => item !== null); // 过滤掉无效数据
    } catch (error) {
        console.error('获取数据失败:', error);
        throw error;
    }
}

// 格式化号码显示
function formatNumbers(red, blue) {
    const redBalls = red.split(',').map(num => `<span class="red-ball">${num}</span>`).join(' ');
    const blueBall = `<span class="blue-ball">${blue}</span>`;
    return { redBalls, blueBall };
}

// 分页显示数据
let currentPage = 1;
const itemsPerPage = 20;

function displayData(data) {
    const tbody = document.querySelector('#lottery-table tbody');
    tbody.innerHTML = '';

    // 计算当前页数据范围
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    // 显示当前页数据
    pageData.forEach(item => {
        const { redBalls, blueBall } = formatNumbers(item.red, item.blue);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.code}</td>
            <td>${redBalls}</td>
            <td>${blueBall}</td>
            <td>${item.date}</td>
        `;
        tbody.appendChild(row);
    });

    // 更新分页导航
    updatePagination(data.length);
}

// 更新分页导航
function updatePagination(totalItems) {
    const pagination = document.querySelector('#pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        currentPage--;
        displayData(allData);
    });
    pagination.appendChild(prevButton);

    // 页码显示
    const pageInfo = document.createElement('span');
    pageInfo.textContent = ` ${currentPage}/${totalPages} `;
    pagination.appendChild(pageInfo);

    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        currentPage++;
        displayData(allData);
    });
    pagination.appendChild(nextButton);
}

// 统计号码出现频率
function calculateStats(data) {
    const redStats = {};
    const blueStats = {};

    data.forEach(item => {
        // 统计红球
        item.red.split(',').forEach(num => {
            redStats[num] = (redStats[num] || 0) + 1;
        });
        // 统计蓝球
        blueStats[item.blue] = (blueStats[item.blue] || 0) + 1;
    });

    return { redStats, blueStats };
}

// 生成5组预测号码
function generatePrediction(redStats, blueStats) {
    const predictions = [];
    for (let i = 0; i < 5; i++) {
        // 生成红球预测
        const redPrediction = Object.entries(redStats)
            .sort((a, b) => b[1] - a[1]) // 按出现频率排序
            .slice(0, 15) // 取前15个高频号码
            .sort(() => Math.random() - 0.5) // 随机打乱顺序
            .slice(0, 6) // 取前6个
            .map(([num]) => num)
            .sort((a, b) => a - b); // 按数字大小排序

        // 生成蓝球预测
        const bluePrediction = Object.entries(blueStats)
            .sort((a, b) => b[1] - a[1]) // 按出现频率排序
            .slice(0, 5) // 取前5个高频号码
            .sort(() => Math.random() - 0.5) // 随机打乱顺序
            .slice(0, 1) // 取1个
            .map(([num]) => num)[0];

        predictions.push({ redPrediction, bluePrediction });
    }
    return predictions;
}

// 显示5组预测号码
function displayPrediction(predictions) {
    const redDiv = document.getElementById('prediction-red');
    const blueDiv = document.getElementById('prediction-blue');
    
    redDiv.innerHTML = predictions.map((pred, index) => `
        <div class="prediction-group">
            <span>第${index + 1}组：</span>
            ${pred.redPrediction.map(num => `
                <span class="red-ball">${num}</span>
            `).join(' ')}
        </div>
    `).join('');

    blueDiv.innerHTML = predictions.map((pred, index) => `
        <div class="prediction-group">
            <span>第${index + 1}组：</span>
            <span class="blue-ball">${pred.bluePrediction}</span>
        </div>
    `).join('');
}

// 保存全部数据
let allData = [];

// 更新当前时间显示
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('current-time').textContent = `当前时间：${timeString}`;
}

// 初始化
async function init() {
    // 初始化时间显示
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    try {
        const data = await getLotteryData();
        if (data.length > 0) {
            console.log('实际获取数据量:', data.length);
            allData = data;
            displayData(allData);
            // 计算统计并显示预测号码
            const { redStats, blueStats } = calculateStats(allData);
            const predictions = generatePrediction(redStats, blueStats);
            displayPrediction(predictions);
        } else {
            throw new Error('API返回数据为空');
        }
    } catch (error) {
        console.error('数据加载失败:', error);
        document.querySelector('#lottery-table tbody').innerHTML = `
            <tr>
                <td colspan="4" style="color: red;">
                    数据加载失败：${error.message}<br>
                    请检查网络连接或稍后重试
                </td>
            </tr>
        `;
    }
}

// 页面加载完成后执行
window.addEventListener('load', init);
