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
function makeViewBoxSquare(viewBox) {
  const [left, top, width, height] = viewBox;
  if (width !== height) {
    const max = Math.max(width, height);
    return [left - (max - width) / 2, top - (max - height) / 2, max, max];
  }
  return viewBox;
}

exports.makeIconSquare = makeIconSquare;
exports.makeViewBoxSquare = makeViewBoxSquare;
