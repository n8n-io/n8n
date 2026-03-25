import { FORWARD, BACKWARD, LTR, RTL, HORIZONTAL, RTL_OFFSET_POS_DESC, RTL_OFFSET_NAG, RTL_OFFSET_POS_ASC, PageKey } from './defaults.mjs';

const getScrollDir = (prev, cur) => prev < cur ? FORWARD : BACKWARD;
const isHorizontal = (dir) => dir === LTR || dir === RTL || dir === HORIZONTAL;
const isRTL = (dir) => dir === RTL;
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
      cachedRTLResult = RTL_OFFSET_POS_DESC;
    } else {
      outerDiv.scrollLeft = 1;
      if (outerDiv.scrollLeft === 0) {
        cachedRTLResult = RTL_OFFSET_NAG;
      } else {
        cachedRTLResult = RTL_OFFSET_POS_ASC;
      }
    }
    document.body.removeChild(outerDiv);
    return cachedRTLResult;
  }
  return cachedRTLResult;
}
const getRelativePos = (e, layout) => {
  return "touches" in e ? e.touches[0][PageKey[layout]] : e[PageKey[layout]];
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

export { getRTLOffsetType, getRelativePos, getScrollDir, isHorizontal, isRTL, renderThumbStyle };
//# sourceMappingURL=utils.mjs.map
