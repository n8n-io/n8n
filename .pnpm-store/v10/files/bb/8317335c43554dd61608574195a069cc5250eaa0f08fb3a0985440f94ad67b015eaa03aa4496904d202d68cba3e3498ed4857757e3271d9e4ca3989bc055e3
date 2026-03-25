'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../constants/index.js');
var aria = require('../../../constants/aria.js');

const MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
const getDirectionAwareKey = (key, dir) => {
  if (dir !== "rtl")
    return key;
  switch (key) {
    case aria.EVENT_CODE.right:
      return aria.EVENT_CODE.left;
    case aria.EVENT_CODE.left:
      return aria.EVENT_CODE.right;
    default:
      return key;
  }
};
const getFocusIntent = (event, orientation, dir) => {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && [aria.EVENT_CODE.left, aria.EVENT_CODE.right].includes(key))
    return void 0;
  if (orientation === "horizontal" && [aria.EVENT_CODE.up, aria.EVENT_CODE.down].includes(key))
    return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
};
const reorderArray = (array, atIdx) => {
  return array.map((_, idx) => array[(idx + atIdx) % array.length]);
};
const focusFirst = (elements) => {
  const { activeElement: prevActive } = document;
  for (const element of elements) {
    if (element === prevActive)
      return;
    element.focus();
    if (prevActive !== document.activeElement)
      return;
  }
};

exports.focusFirst = focusFirst;
exports.getFocusIntent = getFocusIntent;
exports.reorderArray = reorderArray;
//# sourceMappingURL=utils.js.map
