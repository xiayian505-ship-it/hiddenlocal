// 優先使用已上傳到圖床的 SVG。
// 圖床若未允許跨網域讀取，就自動使用 ZIP 內的同份備援 SVG。
const MAP_SVG_URL = 'https://img.stillnessbyslowly.com/i/2pivysp5ve-20261026135847.svg';
const FALLBACK_SVG_URL = './taiwan_counties.svg';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// 名稱直接放在對應縣市圖形上。部分縣市形狀狹長或包含離島，
// 因此明確指定位置，避免單純使用外框中心而落在縣市外面。
// 座標以 prepareMapLayout() 調整後的地圖為準。
const COUNTY_LABEL_POSITIONS = {
  '09007': [449, 155],  // 連江縣
  '09020': [460, 389],  // 金門縣
  '10016': [490, 638],  // 澎湖縣
  '10002': [993, 356],  // 宜蘭縣
  '10007': [634, 525],  // 彰化縣
  '10008': [793, 551],  // 南投縣
  '10009': [615, 600],  // 雲林縣
  '10013': [705, 955],  // 屏東縣
  '10017': [989, 206],  // 基隆市
  '63000': [943, 214],  // 臺北市
  '65000': [896, 273],  // 新北市
  '67000': [607, 760],  // 臺南市
  '68000': [843, 250],  // 桃園市
  '10020': [631, 661],  // 嘉義市
  '10010': [697, 685],  // 嘉義縣
  '64000': [685, 797],  // 高雄市
  '10014': [824, 857],  // 臺東縣
  '10015': [940, 537],  // 花蓮縣
  '10018': [770, 299],  // 新竹市
  '66000': [766, 440],  // 臺中市
  '10005': [766, 381],  // 苗栗縣
  '10004': [849, 341]   // 新竹縣
};


const mapContainer = document.getElementById('map-container');
const countyAnnouncement = document.getElementById('county-announcement');

let countyElements = [];
let activeCountyElement = null;
let initialCountyOrder = [];

function announceCounty(countyName) {
  // 只讓輔助閱讀工具讀出縣市名稱，不在版面額外顯示說明文字。
  countyAnnouncement.textContent = countyName || '';
}

function removeActiveCountyLabel() {
  if (!activeCountyElement) {
    return;
  }

  const label = activeCountyElement.querySelector(':scope > .county-label');
  label?.remove();
}

function showCountyLabel(countyElement) {
  const countyCode = countyElement.dataset.code;
  const countyName = countyElement.dataset.name || '';
  const labelPosition = COUNTY_LABEL_POSITIONS[countyCode];

  if (!labelPosition) {
    return;
  }

  const label = document.createElementNS(SVG_NAMESPACE, 'text');
  label.classList.add('county-label');
  label.setAttribute('x', String(labelPosition[0]));
  label.setAttribute('y', String(labelPosition[1]));
  label.setAttribute('aria-hidden', 'true');
  label.textContent = countyName;

  // 放在縣市圖形的最後面，名稱會跟著被選中的縣市一起浮起。
  countyElement.appendChild(label);
}

function restoreCountyOrder() {
  if (initialCountyOrder.length === 0) {
    return;
  }

  const countyLayer = initialCountyOrder[0].parentNode;

  initialCountyOrder.forEach((countyElement) => {
    countyLayer.appendChild(countyElement);
  });
}

function clearActiveCounty() {
  removeActiveCountyLabel();

  countyElements.forEach((countyElement) => {
    countyElement.classList.remove('is-active');
    countyElement.setAttribute('aria-pressed', 'false');
  });

  activeCountyElement = null;
  restoreCountyOrder();
  announceCounty('');
}

function setActiveCounty(countyElement) {
  removeActiveCountyLabel();

  countyElements.forEach((element) => {
    const isCurrentCounty = element === countyElement;

    element.classList.toggle('is-active', isCurrentCounty);
    element.setAttribute('aria-pressed', String(isCurrentCounty));
  });

  activeCountyElement = countyElement;

  // 把選中的縣市移到 SVG 最上層，浮起時才不會被鄰縣擋住。
  countyElement.parentNode.appendChild(countyElement);
  showCountyLabel(countyElement);
  announceCounty(countyElement.dataset.name || '');
}

function toggleCounty(countyElement) {
  if (activeCountyElement === countyElement) {
    clearActiveCounty();
    return;
  }

  setActiveCounty(countyElement);
}

function handleCountyClick(event) {
  toggleCounty(event.currentTarget);
}

function handleCountyKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  toggleCounty(event.currentTarget);
}

function prepareCounty(countyElement) {
  const countyName = countyElement.dataset.name || '未命名縣市';

  countyElement.setAttribute('tabindex', '0');
  countyElement.setAttribute('role', 'button');
  countyElement.setAttribute('aria-label', countyName);
  countyElement.setAttribute('aria-pressed', 'false');

  countyElement.addEventListener('click', handleCountyClick);
  countyElement.addEventListener('keydown', handleCountyKeydown);
}

function repositionIsland(svgElement, countyCode, xOffset, yOffset) {
  const countyElement = svgElement.querySelector(`#county-${countyCode}`);

  if (!countyElement) {
    return;
  }

  // 縣市外層留給點擊浮起的動畫；內層獨立處理離島位置。
  const illustrationGroup = document.createElementNS(SVG_NAMESPACE, 'g');
  illustrationGroup.setAttribute('transform', `translate(${xOffset} ${yOffset})`);

  const countyPaths = Array.from(countyElement.querySelectorAll('path'));

  countyPaths.forEach((pathElement) => {
    illustrationGroup.appendChild(pathElement);
  });

  countyElement.appendChild(illustrationGroup);
}

function prepareMapLayout(svgElement) {
  // 減少原始 SVG 四周留白，讓本島放得更大，並保留三組離島。
  repositionIsland(svgElement, '09007', 250, 30);  // 連江縣
  repositionIsland(svgElement, '09020', 250, 0);   // 金門縣
  repositionIsland(svgElement, '10016', 100, 0);   // 澎湖縣

  svgElement.setAttribute('viewBox', '340 70 770 1040');
  svgElement.removeAttribute('width');
  svgElement.removeAttribute('height');
  svgElement.setAttribute('aria-label', '臺灣二十二縣市互動地圖');
}

function parseMapSvg(svgMarkup) {
  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svgElement = svgDocument.documentElement;

  if (svgElement.localName !== 'svg' || svgDocument.querySelector('parsererror')) {
    throw new Error('SVG 格式不正確');
  }

  const countyLayer = svgElement.querySelector('#taiwan-counties');
  const counties = countyLayer?.querySelectorAll(':scope > .county');

  if (!counties || counties.length !== 22) {
    throw new Error('SVG 的縣市分區資料不完整');
  }

  // 僅使用來源中經過檢查的縣市路徑資料，不直接插入原始標記。
  const cleanSvg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const cleanCountyLayer = document.createElementNS(SVG_NAMESPACE, 'g');
  cleanCountyLayer.id = 'taiwan-counties';

  counties.forEach((sourceCounty) => {
    const countyCode = sourceCounty.dataset.code;
    const countyName = sourceCounty.dataset.name;
    const sourcePath = sourceCounty.querySelector('path');

    if (!/^\d{5}$/.test(countyCode || '') || !sourcePath?.getAttribute('d')) {
      throw new Error('縣市資料格式不正確');
    }

    const county = document.createElementNS(SVG_NAMESPACE, 'g');
    const path = document.createElementNS(SVG_NAMESPACE, 'path');

    county.id = `county-${countyCode}`;
    county.classList.add('county');
    county.dataset.code = countyCode;
    county.dataset.name = countyName || '';
    path.setAttribute('d', sourcePath.getAttribute('d'));

    county.appendChild(path);
    cleanCountyLayer.appendChild(county);
  });

  cleanSvg.appendChild(cleanCountyLayer);
  return cleanSvg;
}

async function fetchSvgText(url, timeoutMilliseconds) {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), timeoutMilliseconds);

  try {
    const response = await fetch(url, { signal: abortController.signal });

    if (!response.ok) {
      throw new Error(`SVG 載入失敗：${response.status}`);
    }

    return await response.text();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function loadTaiwanMap() {
  let svgMarkup;

  try {
    svgMarkup = await fetchSvgText(MAP_SVG_URL, 4000);
  } catch (remoteError) {
    console.info('圖床 SVG 無法直接讀取，改用本地 SVG。', remoteError);

    try {
      svgMarkup = await fetchSvgText(FALLBACK_SVG_URL, 4000);
    } catch (fallbackError) {
      console.error('台灣地圖載入失敗。', fallbackError);
      return;
    }
  }

  try {
    const svgElement = parseMapSvg(svgMarkup);

    prepareMapLayout(svgElement);
    mapContainer.replaceChildren(svgElement);

    countyElements = Array.from(svgElement.querySelectorAll('#taiwan-counties > .county'));
    initialCountyOrder = [...countyElements];

    countyElements.forEach(prepareCounty);
  } catch (error) {
    console.error('台灣地圖初始化失敗。', error);
  }
}

loadTaiwanMap();
