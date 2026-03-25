'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.printDiffLines =
  exports.diffLinesUnified2 =
  exports.diffLinesUnified =
  exports.diffLinesRaw =
    void 0;
var _diffSequences = _interopRequireDefault(require('diff-sequences'));
var _cleanupSemantic = require('./cleanupSemantic');
var _joinAlignedDiffs = require('./joinAlignedDiffs');
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

const isEmptyString = lines => lines.length === 1 && lines[0].length === 0;
const countChanges = diffs => {
  let a = 0;
  let b = 0;
  diffs.forEach(diff => {
    switch (diff[0]) {
      case _cleanupSemantic.DIFF_DELETE:
        a += 1;
        break;
      case _cleanupSemantic.DIFF_INSERT:
        b += 1;
        break;
    }
  });
  return {
    a,
    b
  };
};
const printAnnotation = (
  {
    aAnnotation,
    aColor,
    aIndicator,
    bAnnotation,
    bColor,
    bIndicator,
    includeChangeCounts,
    omitAnnotationLines
  },
  changeCounts
) => {
  if (omitAnnotationLines) {
    return '';
  }
  let aRest = '';
  let bRest = '';
  if (includeChangeCounts) {
    const aCount = String(changeCounts.a);
    const bCount = String(changeCounts.b);

    // Padding right aligns the ends of the annotations.
    const baAnnotationLengthDiff = bAnnotation.length - aAnnotation.length;
    const aAnnotationPadding = ' '.repeat(Math.max(0, baAnnotationLengthDiff));
    const bAnnotationPadding = ' '.repeat(Math.max(0, -baAnnotationLengthDiff));

    // Padding left aligns the ends of the counts.
    const baCountLengthDiff = bCount.length - aCount.length;
    const aCountPadding = ' '.repeat(Math.max(0, baCountLengthDiff));
    const bCountPadding = ' '.repeat(Math.max(0, -baCountLengthDiff));
    aRest = `${aAnnotationPadding}  ${aIndicator} ${aCountPadding}${aCount}`;
    bRest = `${bAnnotationPadding}  ${bIndicator} ${bCountPadding}${bCount}`;
  }
  const a = `${aIndicator} ${aAnnotation}${aRest}`;
  const b = `${bIndicator} ${bAnnotation}${bRest}`;
  return `${aColor(a)}\n${bColor(b)}\n\n`;
};
const printDiffLines = (diffs, options) =>
  printAnnotation(options, countChanges(diffs)) +
  (options.expand
    ? (0, _joinAlignedDiffs.joinAlignedDiffsExpand)(diffs, options)
    : (0, _joinAlignedDiffs.joinAlignedDiffsNoExpand)(diffs, options));

// Compare two arrays of strings line-by-line. Format as comparison lines.
exports.printDiffLines = printDiffLines;
const diffLinesUnified = (aLines, bLines, options) =>
  printDiffLines(
    diffLinesRaw(
      isEmptyString(aLines) ? [] : aLines,
      isEmptyString(bLines) ? [] : bLines
    ),
    (0, _normalizeDiffOptions.normalizeDiffOptions)(options)
  );

// Given two pairs of arrays of strings:
// Compare the pair of comparison arrays line-by-line.
// Format the corresponding lines in the pair of displayable arrays.
exports.diffLinesUnified = diffLinesUnified;
const diffLinesUnified2 = (
  aLinesDisplay,
  bLinesDisplay,
  aLinesCompare,
  bLinesCompare,
  options
) => {
  if (isEmptyString(aLinesDisplay) && isEmptyString(aLinesCompare)) {
    aLinesDisplay = [];
    aLinesCompare = [];
  }
  if (isEmptyString(bLinesDisplay) && isEmptyString(bLinesCompare)) {
    bLinesDisplay = [];
    bLinesCompare = [];
  }
  if (
    aLinesDisplay.length !== aLinesCompare.length ||
    bLinesDisplay.length !== bLinesCompare.length
  ) {
    // Fall back to diff of display lines.
    return diffLinesUnified(aLinesDisplay, bLinesDisplay, options);
  }
  const diffs = diffLinesRaw(aLinesCompare, bLinesCompare);

  // Replace comparison lines with displayable lines.
  let aIndex = 0;
  let bIndex = 0;
  diffs.forEach(diff => {
    switch (diff[0]) {
      case _cleanupSemantic.DIFF_DELETE:
        diff[1] = aLinesDisplay[aIndex];
        aIndex += 1;
        break;
      case _cleanupSemantic.DIFF_INSERT:
        diff[1] = bLinesDisplay[bIndex];
        bIndex += 1;
        break;
      default:
        diff[1] = bLinesDisplay[bIndex];
        aIndex += 1;
        bIndex += 1;
    }
  });
  return printDiffLines(
    diffs,
    (0, _normalizeDiffOptions.normalizeDiffOptions)(options)
  );
};

// Compare two arrays of strings line-by-line.
exports.diffLinesUnified2 = diffLinesUnified2;
const diffLinesRaw = (aLines, bLines) => {
  const aLength = aLines.length;
  const bLength = bLines.length;
  const isCommon = (aIndex, bIndex) => aLines[aIndex] === bLines[bIndex];
  const diffs = [];
  let aIndex = 0;
  let bIndex = 0;
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      diffs.push(
        new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_DELETE, aLines[aIndex])
      );
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      diffs.push(
        new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_INSERT, bLines[bIndex])
      );
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      diffs.push(
        new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_EQUAL, bLines[bIndex])
      );
    }
  };
  (0, _diffSequences.default)(aLength, bLength, isCommon, foundSubsequence);

  // After the last common subsequence, push remaining change items.
  for (; aIndex !== aLength; aIndex += 1) {
    diffs.push(
      new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_DELETE, aLines[aIndex])
    );
  }
  for (; bIndex !== bLength; bIndex += 1) {
    diffs.push(
      new _cleanupSemantic.Diff(_cleanupSemantic.DIFF_INSERT, bLines[bIndex])
    );
  }
  return diffs;
};
exports.diffLinesRaw = diffLinesRaw;
