'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = formatTestNameByPattern;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
var _colorize = _interopRequireDefault(require('./colorize'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const DOTS = '...';
const ENTER = '⏎';
function formatTestNameByPattern(testName, pattern, width) {
  const inlineTestName = testName.replace(/(\r\n|\n|\r)/gm, ENTER);
  let regexp;
  try {
    regexp = new RegExp(pattern, 'i');
  } catch {
    return _chalk().default.dim(inlineTestName);
  }
  const match = inlineTestName.match(regexp);
  if (!match) {
    return _chalk().default.dim(inlineTestName);
  }
  const startPatternIndex = Math.max(match.index ?? 0, 0);
  const endPatternIndex = startPatternIndex + match[0].length;
  if (inlineTestName.length <= width) {
    return (0, _colorize.default)(
      inlineTestName,
      startPatternIndex,
      endPatternIndex
    );
  }
  const slicedTestName = inlineTestName.slice(0, width - DOTS.length);
  if (startPatternIndex < slicedTestName.length) {
    if (endPatternIndex > slicedTestName.length) {
      return (0, _colorize.default)(
        slicedTestName + DOTS,
        startPatternIndex,
        slicedTestName.length + DOTS.length
      );
    } else {
      return (0, _colorize.default)(
        slicedTestName + DOTS,
        Math.min(startPatternIndex, slicedTestName.length),
        endPatternIndex
      );
    }
  }
  return `${_chalk().default.dim(slicedTestName)}${_chalk().default.reset(
    DOTS
  )}`;
}
