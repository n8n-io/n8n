'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var defaults = require('./defaults.js');

const getScrollDir = (prev, cur) => prev < cur ? defaults.FORWARD : defaults.BACKWARD;
const isHorizontal = (dir) => dir === defaults.LTR || dir === defaults.RTL || dir === defaults.HORIZONTAL;
const isRTL = (dir) => dir === defaults.RTL;
let cachedRTLResult = null;
function getRTLOffsetType(recalculate = false) {
  if (cachedRTLResult === null || recalculate) {
    const outerDiv = document.createElement("div");
    const outerStyle = outerDiv.style;
    outerStyle.width = "50px";
    outerStyle.height = "50px";
    outerStyle.overflow = "scroll";
    outerStyle.direction = "rtl";
    const innerDiv = document.createElement("div");
    const innerStyle = innerDiv.style;
    innerStyle.width = "100px";
    innerStyle.height = "100px";
    outerDiv.appendChild(innerDiv);
    document.body.appendChild(outerDiv);
    if (outerDiv.scrollLeft > 0) {
      cachedRTLResult = defaults.RTL_OFFSET_POS_DESC;
    } else {
      outerDiv.scrollLeft = 1;
      if (outerDiv.scrollLeft === 0) {
        cachedRTLResult = defaults.RTL_OFFSET_NAG;
      } else {
        cachedRTLResult = defaults.RTL_OFFSET_POS_ASC;
      }
    }
    document.body.removeChild(outerDiv);
    return cachedRTLResult;
  }
  return cachedRTLResult;
}
const getRelativePos = (e, layout) => {
  return "touches" in e ? e.touches[0][defaults.PageKey[layout]] : e[defaults.PageKey[layout]];
};
function renderThumbStyle({ move, size, bar }, layout) {
  const style = {};
  const translate = `translate${bar.axis}(${move}px)`;
  style[bar.size] = size;
  style.transform = translate;
  style.msTransform = translate;
  style.webkitTransform = translate;
  if (layout === "horizontal") {
    style.height = "100%";
  } else {
    style.width = "100%";
  }
  return style;
}

exports.getRTLOffsetType = getRTLOffsetType;
exports.getRelativePos = getRelativePos;
exports.getScrollDir = getScrollDir;
exports.isHorizontal = isHorizontal;
exports.isRTL = isRTL;
exports.renderThumbStyle = renderThumbStyle;
//# sourceMappingURL=utils.js.map
