'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.joinAlignedDiffsNoExpand = exports.joinAlignedDiffsExpand = void 0;
var _cleanupSemantic = require('./cleanupSemantic');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const formatTrailingSpaces = (line, trailingSpaceFormatter) =>
  line.replace(/\s+$/, match => trailingSpaceFormatter(match));
const printDiffLine = (
  line,
  isFirstOrLast,
  color,
  indicator,
  trailingSpaceFormatter,
  emptyFirstOrLastLinePlaceholder
) =>
  line.length !== 0
    ? color(
        `${indicator} ${formatTrailingSpaces(line, trailingSpaceFormatter)}`
      )
    : indicator !== ' '
    ? color(indicator)
    : isFirstOrLast && emptyFirstOrLastLinePlaceholder.length !== 0
    ? color(`${indicator} ${emptyFirstOrLastLinePlaceholder}`)
    : '';
const printDeleteLine = (
  line,
  isFirstOrLast,
  {
    aColor,
    aIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  }
) =>
  printDiffLine(
    line,
    isFirstOrLast,
    aColor,
    aIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );
const printInsertLine = (
  line,
  isFirstOrLast,
  {
    bColor,
    bIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  }
) =>
  printDiffLine(
    line,
    isFirstOrLast,
    bColor,
    bIndicator,
    changeLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );
const printCommonLine = (
  line,
  isFirstOrLast,
  {
    commonColor,
    commonIndicator,
    commonLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  }
) =>
  printDiffLine(
    line,
    isFirstOrLast,
    commonColor,
    commonIndicator,
    commonLineTrailingSpaceColor,
    emptyFirstOrLastLinePlaceholder
  );

// In GNU diff format, indexes are one-based instead of zero-based.
const createPatchMark = (aStart, aEnd, bStart, bEnd, {patchColor}) =>
  patchColor(
    `@@ -${aStart + 1},${aEnd - aStart} +${bStart + 1},${bEnd - bStart} @@`
  );

// jest --no-expand
//
// Given array of aligned strings with inverse highlight formatting,
// return joined lines with diff formatting (and patch marks, if needed).
const joinAlignedDiffsNoExpand = (diffs, options) => {
  const iLength = diffs.length;
  const nContextLines = options.contextLines;
  const nContextLines2 = nContextLines + nContextLines;

  // First pass: count output lines and see if it has patches.
  let jLength = iLength;
  let hasExcessAtStartOrEnd = false;
  let nExcessesBetweenChanges = 0;
  let i = 0;
  while (i !== iLength) {
    const iStart = i;
    while (i !== iLength && diffs[i][0] === _cleanupSemantic.DIFF_EQUAL) {
      i += 1;
    }
    if (iStart !== i) {
      if (iStart === 0) {
        // at start
        if (i > nContextLines) {
          jLength -= i - nContextLines; // subtract excess common lines
          hasExcessAtStartOrEnd = true;
        }
      } else if (i === iLength) {
        // at end
        const n = i - iStart;
        if (n > nContextLines) {
          jLength -= n - nContextLines; // subtract excess common lines
          hasExcessAtStartOrEnd = true;
        }
      } else {
        // between changes
        const n = i - iStart;
        if (n > nContextLines2) {
          jLength -= n - nContextLines2; // subtract excess common lines
          nExcessesBetweenChanges += 1;
        }
      }
    }
    while (i !== iLength && diffs[i][0] !== _cleanupSemantic.DIFF_EQUAL) {
      i += 1;
    }
  }
  const hasPatch = nExcessesBetweenChanges !== 0 || hasExcessAtStartOrEnd;
  if (nExcessesBetweenChanges !== 0) {
    jLength += nExcessesBetweenChanges + 1; // add patch lines
  } else if (hasExcessAtStartOrEnd) {
    jLength += 1; // add patch line
  }

  const jLast = jLength - 1;
  const lines = [];
  let jPatchMark = 0; // index of placeholder line for current patch mark
  if (hasPatch) {
    lines.push(''); // placeholder line for first patch mark
  }

  // Indexes of expected or received lines in current patch:
  let aStart = 0;
  let bStart = 0;
  let aEnd = 0;
  let bEnd = 0;
  const pushCommonLine = line => {
    const j = lines.length;
    lines.push(printCommonLine(line, j === 0 || j === jLast, options));
    aEnd += 1;
    bEnd += 1;
  };
  const pushDeleteLine = line => {
    const j = lines.length;
    lines.push(printDeleteLine(line, j === 0 || j === jLast, options));
    aEnd += 1;
  };
  const pushInsertLine = line => {
    const j = lines.length;
    lines.push(printInsertLine(line, j === 0 || j === jLast, options));
    bEnd += 1;
  };

  // Second pass: push lines with diff formatting (and patch marks, if needed).
  i = 0;
  while (i !== iLength) {
    let iStart = i;
    while (i !== iLength && diffs[i][0] === _cleanupSemantic.DIFF_EQUAL) {
      i += 1;
    }
    if (iStart !== i) {
      if (iStart === 0) {
        // at beginning
        if (i > nContextLines) {
          iStart = i - nContextLines;
          aStart = iStart;
          bStart = iStart;
          aEnd = aStart;
          bEnd = bStart;
        }
        for (let iCommon = iStart; iCommon !== i; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else if (i === iLength) {
        // at end
        const iEnd = i - iStart > nContextLines ? iStart + nContextLines : i;
        for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else {
        // between changes
        const nCommon = i - iStart;
        if (nCommon > nContextLines2) {
          const iEnd = iStart + nContextLines;
          for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
          lines[jPatchMark] = createPatchMark(
            aStart,
            aEnd,
            bStart,
            bEnd,
            options
          );
          jPatchMark = lines.length;
          lines.push(''); // placeholder line for next patch mark

          const nOmit = nCommon - nContextLines2;
          aStart = aEnd + nOmit;
          bStart = bEnd + nOmit;
          aEnd = aStart;
          bEnd = bStart;
          for (let iCommon = i - nContextLines; iCommon !== i; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        } else {
          for (let iCommon = iStart; iCommon !== i; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        }
      }
    }
    while (i !== iLength && diffs[i][0] === _cleanupSemantic.DIFF_DELETE) {
      pushDeleteLine(diffs[i][1]);
      i += 1;
    }
    while (i !== iLength && diffs[i][0] === _cleanupSemantic.DIFF_INSERT) {
      pushInsertLine(diffs[i][1]);
      i += 1;
    }
  }
  if (hasPatch) {
    lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options);
  }
  return lines.join('\n');
};

// jest --expand
//
// Given array of aligned strings with inverse highlight formatting,
// return joined lines with diff formatting.
exports.joinAlignedDiffsNoExpand = joinAlignedDiffsNoExpand;
const joinAlignedDiffsExpand = (diffs, options) =>
  diffs
    .map((diff, i, diffs) => {
      const line = diff[1];
      const isFirstOrLast = i === 0 || i === diffs.length - 1;
      switch (diff[0]) {
        case _cleanupSemantic.DIFF_DELETE:
          return printDeleteLine(line, isFirstOrLast, options);
        case _cleanupSemantic.DIFF_INSERT:
          return printInsertLine(line, isFirstOrLast, options);
        default:
          return printCommonLine(line, isFirstOrLast, options);
      }
    })
    .join('\n');
exports.joinAlignedDiffsExpand = joinAlignedDiffsExpand;
