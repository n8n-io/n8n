'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
var defaults = require('../defaults.js');
var raf = require('../../../../utils/raf.js');
var browser = require('../../../../utils/browser.js');

const LayoutKeys = {
  [defaults.HORIZONTAL]: "deltaX",
  [defaults.VERTICAL]: "deltaY"
};
const useWheel = ({ atEndEdge, atStartEdge, layout }, onWheelDelta) => {
  let frameHandle;
  let offset = 0;
  const hasReachedEdge = (offset2) => {
    const edgeReached = offset2 < 0 && atStartEdge.value || offset2 > 0 && atEndEdge.value;
    return edgeReached;
  };
  const onWheel = (e) => {
    raf.cAF(frameHandle);
    const newOffset = e[LayoutKeys[layout.value]];
    if (hasReachedEdge(offset) && hasReachedEdge(offset + newOffset))
      return;
    offset += newOffset;
    if (!browser.isFirefox()) {
      e.preventDefault();
    }
    frameHandle = raf.rAF(() => {
      onWheelDelta(offset);
      offset = 0;
    });
  };
  return {
    hasReachedEdge,
    onWheel
  };
};

exports["default"] = useWheel;
//# sourceMappingURL=use-wheel.js.map
