'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
var raf = require('../../../../utils/raf.js');

const useGridWheel = ({ atXEndEdge, atXStartEdge, atYEndEdge, atYStartEdge }, onWheelDelta) => {
  let frameHandle = null;
  let xOffset = 0;
  let yOffset = 0;
  const hasReachedEdge = (x, y) => {
    const xEdgeReached = x <= 0 && atXStartEdge.value || x >= 0 && atXEndEdge.value;
    const yEdgeReached = y <= 0 && atYStartEdge.value || y >= 0 && atYEndEdge.value;
    return xEdgeReached && yEdgeReached;
  };
  const onWheel = (e) => {
    raf.cAF(frameHandle);
    let x = e.deltaX;
    let y = e.deltaY;
    if (Math.abs(x) > Math.abs(y)) {
      y = 0;
    } else {
      x = 0;
    }
    if (e.shiftKey && y !== 0) {
      x = y;
      y = 0;
    }
    if (hasReachedEdge(xOffset, yOffset) && hasReachedEdge(xOffset + x, yOffset + y))
      return;
    xOffset += x;
    yOffset += y;
    e.preventDefault();
    frameHandle = raf.rAF(() => {
      onWheelDelta(xOffset, yOffset);
      xOffset = 0;
      yOffset = 0;
    });
  };
  return {
    hasReachedEdge,
    onWheel
  };
};

exports.useGridWheel = useGridWheel;
//# sourceMappingURL=use-grid-wheel.js.map
