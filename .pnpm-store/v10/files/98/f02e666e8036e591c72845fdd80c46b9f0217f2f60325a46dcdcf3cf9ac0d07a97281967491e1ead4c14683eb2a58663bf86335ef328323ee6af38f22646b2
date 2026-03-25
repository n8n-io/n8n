'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.diffStringsUnified = exports.diffStringsRaw = void 0;
var _cleanupSemantic = require('./cleanupSemantic');
var _diffLines = require('./diffLines');
var _diffStrings = _interopRequireDefault(require('./diffStrings'));
var _getAlignedDiffs = _interopRequireDefault(require('./getAlignedDiffs'));
var _normalizeDiffOptions = require('./normalizeDiffOptions');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const hasCommonDiff = (diffs, isMultiline) => {
  if (isMultiline) {
    // Important: Ignore common newline that was appended to multiline strings!
    const iLast = diffs.length - 1;
    return diffs.some(
      (diff, i) =>
        diff[0] === _cleanupSemantic.DIFF_EQUAL &&
        (i !== iLast || diff[1] !== '\n')
    );
  }
  return diffs.some(diff => diff[0] === _cleanupSemantic.DIFF_EQUAL);
};

// Compare two strings character-by-character.
// Format as comparison lines in which changed substrings have inverse colors.
const diffStringsUnified = (a, b, options) => {
  if (a !== b && a.length !== 0 && b.length !== 0) {
    const isMultiline = a.includes('\n') || b.includes('\n');

    // getAlignedDiffs assumes that a newline was appended to the strings.
    const diffs = diffStringsRaw(
      isMultiline ? `${a}\n` : a,
      isMultiline ? `${b}\n` : b,
      true // cleanupSemantic
    );

    if (hasCommonDiff(diffs, isMultiline)) {
      const optionsNormalized = (0, _normalizeDiffOptions.normalizeDiffOptions)(
        options
      );
      const lines = (0, _getAlignedDiffs.default)(
        diffs,
        optionsNormalized.changeColor
      );
      return (0, _diffLines.printDiffLines)(lines, optionsNormalized);
    }
  }

  // Fall back to line-by-line diff.
  return (0, _diffLines.diffLinesUnified)(
    a.split('\n'),
    b.split('\n'),
    options
  );
};

// Compare two strings character-by-character.
// Optionally clean up small common substrings, also known as chaff.
exports.diffStringsUnified = diffStringsUnified;
const diffStringsRaw = (a, b, cleanup) => {
  const diffs = (0, _diffStrings.default)(a, b);
  if (cleanup) {
    (0, _cleanupSemantic.cleanupSemantic)(diffs); // impure function
  }

  return diffs;
};
exports.diffStringsRaw = diffStringsRaw;
