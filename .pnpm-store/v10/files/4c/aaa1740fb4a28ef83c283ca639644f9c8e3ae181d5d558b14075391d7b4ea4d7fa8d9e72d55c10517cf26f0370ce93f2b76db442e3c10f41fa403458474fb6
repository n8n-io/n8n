'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _diffSequences = _interopRequireDefault(require('diff-sequences'));
var _cleanupSemantic = require('./cleanupSemantic');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const diffStrings = (a, b) => {
  const isCommon = (aIndex, bIndex) => a[aIndex] === b[bIndex];
  let aIndex = 0;
  let bIndex = 0;
  const diffs = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    if (aIndex !== aCommon) {
      diffs.push(
        new _cleanupSemantic.Diff(
          _cleanupSemantic.DIFF_DELETE,
          a.slice(aIndex, aCommon)
        )
      );
    }
    if (bIndex !== bCommon) {
      diffs.push(
        new _cleanupSemantic.Diff(
          _cleanupSemantic.DIFF_INSERT,
          b.slice(bIndex, bCommon)
        )
      );
    }
    aIndex = aCommon + nCommon; // number of characters compared in a
    bIndex = bCommon + nCommon; // number of characters compared in b
    diffs.push(
      new _cleanupSemantic.Diff(
        _cleanupSemantic.DIFF_EQUAL,
        b.slice(bCommon, bIndex)
      )
    );
  };
  (0, _diffSequences.default)(a.length, b.length, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change items.
  if (aIndex !== a.length) {
    diffs.push(
      new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_DELETE, a.slice(aIndex))
    );
  }
  if (bIndex !== b.length) {
    diffs.push(
      new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_INSERT, b.slice(bIndex))
    );
  }
  return diffs;
};
var _default = diffStrings;
exports.default = _default;
