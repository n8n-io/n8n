'use strict';

function makeIconSquare(icon) {
  if (icon.width !== icon.height) {
    const max = Math.max(icon.width, icon.height);
    return {
      ...icon,
      width: max,
      height: max,
      left: icon.left - (max - icon.width) / 2,
      top: icon.top - (max - icon.height) / 2
    };
  }
  return icon;
}

exports.makeIconSquare = makeIconSquare;
