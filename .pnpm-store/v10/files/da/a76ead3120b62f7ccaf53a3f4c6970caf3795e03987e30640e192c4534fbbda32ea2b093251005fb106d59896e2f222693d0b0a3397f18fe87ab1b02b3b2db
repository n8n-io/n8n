'use strict';

function getSVGViewBox(value) {
  const result = value.trim().split(/\s+/).map(Number);
  if (result.length === 4 && result.reduce((prev, value2) => prev && !isNaN(value2), true)) {
    return result;
  }
}

exports.getSVGViewBox = getSVGViewBox;
