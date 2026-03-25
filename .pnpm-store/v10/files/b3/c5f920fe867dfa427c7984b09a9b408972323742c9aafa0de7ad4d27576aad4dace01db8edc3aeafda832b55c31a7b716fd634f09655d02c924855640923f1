'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = diffSequence;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// This diff-sequences package implements the linear space variation in
// An O(ND) Difference Algorithm and Its Variations by Eugene W. Myers

// Relationship in notation between Myers paper and this package:
// A is a
// N is aLength, aEnd - aStart, and so on
// x is aIndex, aFirst, aLast, and so on
// B is b
// M is bLength, bEnd - bStart, and so on
// y is bIndex, bFirst, bLast, and so on
// Δ = N - M is negative of baDeltaLength = bLength - aLength
// D is d
// k is kF
// k + Δ is kF = kR - baDeltaLength
// V is aIndexesF or aIndexesR (see comment below about Indexes type)
// index intervals [1, N] and [1, M] are [0, aLength) and [0, bLength)
// starting point in forward direction (0, 0) is (-1, -1)
// starting point in reverse direction (N + 1, M + 1) is (aLength, bLength)

// The “edit graph” for sequences a and b corresponds to items:
// in a on the horizontal axis
// in b on the vertical axis
//
// Given a-coordinate of a point in a diagonal, you can compute b-coordinate.
//
// Forward diagonals kF:
// zero diagonal intersects top left corner
// positive diagonals intersect top edge
// negative diagonals insersect left edge
//
// Reverse diagonals kR:
// zero diagonal intersects bottom right corner
// positive diagonals intersect right edge
// negative diagonals intersect bottom edge

// The graph contains a directed acyclic graph of edges:
// horizontal: delete an item from a
// vertical: insert an item from b
// diagonal: common item in a and b
//
// The algorithm solves dual problems in the graph analogy:
// Find longest common subsequence: path with maximum number of diagonal edges
// Find shortest edit script: path with minimum number of non-diagonal edges

// Input callback function compares items at indexes in the sequences.

// Output callback function receives the number of adjacent items
// and starting indexes of each common subsequence.
// Either original functions or wrapped to swap indexes if graph is transposed.
// Indexes in sequence a of last point of forward or reverse paths in graph.
// Myers algorithm indexes by diagonal k which for negative is bad deopt in V8.
// This package indexes by iF and iR which are greater than or equal to zero.
// and also updates the index arrays in place to cut memory in half.
// kF = 2 * iF - d
// kR = d - 2 * iR
// Division of index intervals in sequences a and b at the middle change.
// Invariant: intervals do not have common items at the start or end.
const pkg = 'diff-sequences'; // for error messages
const NOT_YET_SET = 0; // small int instead of undefined to avoid deopt in V8

// Return the number of common items that follow in forward direction.
// The length of what Myers paper calls a “snake” in a forward path.
const countCommonItemsF = (aIndex, aEnd, bIndex, bEnd, isCommon) => {
  let nCommon = 0;
  while (aIndex < aEnd && bIndex < bEnd && isCommon(aIndex, bIndex)) {
    aIndex += 1;
    bIndex += 1;
    nCommon += 1;
  }
  return nCommon;
};

// Return the number of common items that precede in reverse direction.
// The length of what Myers paper calls a “snake” in a reverse path.
const countCommonItemsR = (aStart, aIndex, bStart, bIndex, isCommon) => {
  let nCommon = 0;
  while (aStart <= aIndex && bStart <= bIndex && isCommon(aIndex, bIndex)) {
    aIndex -= 1;
    bIndex -= 1;
    nCommon += 1;
  }
  return nCommon;
};

// A simple function to extend forward paths from (d - 1) to d changes
// when forward and reverse paths cannot yet overlap.
const extendPathsF = (
  d,
  aEnd,
  bEnd,
  bF,
  isCommon,
  aIndexesF,
  iMaxF // return the value because optimization might decrease it
) => {
  // Unroll the first iteration.
  let iF = 0;
  let kF = -d; // kF = 2 * iF - d
  let aFirst = aIndexesF[iF]; // in first iteration always insert
  let aIndexPrev1 = aFirst; // prev value of [iF - 1] in next iteration
  aIndexesF[iF] += countCommonItemsF(
    aFirst + 1,
    aEnd,
    bF + aFirst - kF + 1,
    bEnd,
    isCommon
  );

  // Optimization: skip diagonals in which paths cannot ever overlap.
  const nF = d < iMaxF ? d : iMaxF;

  // The diagonals kF are odd when d is odd and even when d is even.
  for (iF += 1, kF += 2; iF <= nF; iF += 1, kF += 2) {
    // To get first point of path segment, move one change in forward direction
    // from last point of previous path segment in an adjacent diagonal.
    // In last possible iteration when iF === d and kF === d always delete.
    if (iF !== d && aIndexPrev1 < aIndexesF[iF]) {
      aFirst = aIndexesF[iF]; // vertical to insert from b
    } else {
      aFirst = aIndexPrev1 + 1; // horizontal to delete from a

      if (aEnd <= aFirst) {
        // Optimization: delete moved past right of graph.
        return iF - 1;
      }
    }

    // To get last point of path segment, move along diagonal of common items.
    aIndexPrev1 = aIndexesF[iF];
    aIndexesF[iF] =
      aFirst +
      countCommonItemsF(aFirst + 1, aEnd, bF + aFirst - kF + 1, bEnd, isCommon);
  }
  return iMaxF;
};

// A simple function to extend reverse paths from (d - 1) to d changes
// when reverse and forward paths cannot yet overlap.
const extendPathsR = (
  d,
  aStart,
  bStart,
  bR,
  isCommon,
  aIndexesR,
  iMaxR // return the value because optimization might decrease it
) => {
  // Unroll the first iteration.
  let iR = 0;
  let kR = d; // kR = d - 2 * iR
  let aFirst = aIndexesR[iR]; // in first iteration always insert
  let aIndexPrev1 = aFirst; // prev value of [iR - 1] in next iteration
  aIndexesR[iR] -= countCommonItemsR(
    aStart,
    aFirst - 1,
    bStart,
    bR + aFirst - kR - 1,
    isCommon
  );

  // Optimization: skip diagonals in which paths cannot ever overlap.
  const nR = d < iMaxR ? d : iMaxR;

  // The diagonals kR are odd when d is odd and even when d is even.
  for (iR += 1, kR -= 2; iR <= nR; iR += 1, kR -= 2) {
    // To get first point of path segment, move one change in reverse direction
    // from last point of previous path segment in an adjacent diagonal.
    // In last possible iteration when iR === d and kR === -d always delete.
    if (iR !== d && aIndexesR[iR] < aIndexPrev1) {
      aFirst = aIndexesR[iR]; // vertical to insert from b
    } else {
      aFirst = aIndexPrev1 - 1; // horizontal to delete from a

      if (aFirst < aStart) {
        // Optimization: delete moved past left of graph.
        return iR - 1;
      }
    }

    // To get last point of path segment, move along diagonal of common items.
    aIndexPrev1 = aIndexesR[iR];
    aIndexesR[iR] =
      aFirst -
      countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bR + aFirst - kR - 1,
        isCommon
      );
  }
  return iMaxR;
};

// A complete function to extend forward paths from (d - 1) to d changes.
// Return true if a path overlaps reverse path of (d - 1) changes in its diagonal.
const extendOverlappablePathsF = (
  d,
  aStart,
  aEnd,
  bStart,
  bEnd,
  isCommon,
  aIndexesF,
  iMaxF,
  aIndexesR,
  iMaxR,
  division // update prop values if return true
) => {
  const bF = bStart - aStart; // bIndex = bF + aIndex - kF
  const aLength = aEnd - aStart;
  const bLength = bEnd - bStart;
  const baDeltaLength = bLength - aLength; // kF = kR - baDeltaLength

  // Range of diagonals in which forward and reverse paths might overlap.
  const kMinOverlapF = -baDeltaLength - (d - 1); // -(d - 1) <= kR
  const kMaxOverlapF = -baDeltaLength + (d - 1); // kR <= (d - 1)

  let aIndexPrev1 = NOT_YET_SET; // prev value of [iF - 1] in next iteration

  // Optimization: skip diagonals in which paths cannot ever overlap.
  const nF = d < iMaxF ? d : iMaxF;

  // The diagonals kF = 2 * iF - d are odd when d is odd and even when d is even.
  for (let iF = 0, kF = -d; iF <= nF; iF += 1, kF += 2) {
    // To get first point of path segment, move one change in forward direction
    // from last point of previous path segment in an adjacent diagonal.
    // In first iteration when iF === 0 and kF === -d always insert.
    // In last possible iteration when iF === d and kF === d always delete.
    const insert = iF === 0 || (iF !== d && aIndexPrev1 < aIndexesF[iF]);
    const aLastPrev = insert ? aIndexesF[iF] : aIndexPrev1;
    const aFirst = insert
      ? aLastPrev // vertical to insert from b
      : aLastPrev + 1; // horizontal to delete from a

    // To get last point of path segment, move along diagonal of common items.
    const bFirst = bF + aFirst - kF;
    const nCommonF = countCommonItemsF(
      aFirst + 1,
      aEnd,
      bFirst + 1,
      bEnd,
      isCommon
    );
    const aLast = aFirst + nCommonF;
    aIndexPrev1 = aIndexesF[iF];
    aIndexesF[iF] = aLast;
    if (kMinOverlapF <= kF && kF <= kMaxOverlapF) {
      // Solve for iR of reverse path with (d - 1) changes in diagonal kF:
      // kR = kF + baDeltaLength
      // kR = (d - 1) - 2 * iR
      const iR = (d - 1 - (kF + baDeltaLength)) / 2;

      // If this forward path overlaps the reverse path in this diagonal,
      // then this is the middle change of the index intervals.
      if (iR <= iMaxR && aIndexesR[iR] - 1 <= aLast) {
        // Unlike the Myers algorithm which finds only the middle “snake”
        // this package can find two common subsequences per division.
        // Last point of previous path segment is on an adjacent diagonal.
        const bLastPrev = bF + aLastPrev - (insert ? kF + 1 : kF - 1);

        // Because of invariant that intervals preceding the middle change
        // cannot have common items at the end,
        // move in reverse direction along a diagonal of common items.
        const nCommonR = countCommonItemsR(
          aStart,
          aLastPrev,
          bStart,
          bLastPrev,
          isCommon
        );
        const aIndexPrevFirst = aLastPrev - nCommonR;
        const bIndexPrevFirst = bLastPrev - nCommonR;
        const aEndPreceding = aIndexPrevFirst + 1;
        const bEndPreceding = bIndexPrevFirst + 1;
        division.nChangePreceding = d - 1;
        if (d - 1 === aEndPreceding + bEndPreceding - aStart - bStart) {
          // Optimization: number of preceding changes in forward direction
          // is equal to number of items in preceding interval,
          // therefore it cannot contain any common items.
          division.aEndPreceding = aStart;
          division.bEndPreceding = bStart;
        } else {
          division.aEndPreceding = aEndPreceding;
          division.bEndPreceding = bEndPreceding;
        }
        division.nCommonPreceding = nCommonR;
        if (nCommonR !== 0) {
          division.aCommonPreceding = aEndPreceding;
          division.bCommonPreceding = bEndPreceding;
        }
        division.nCommonFollowing = nCommonF;
        if (nCommonF !== 0) {
          division.aCommonFollowing = aFirst + 1;
          division.bCommonFollowing = bFirst + 1;
        }
        const aStartFollowing = aLast + 1;
        const bStartFollowing = bFirst + nCommonF + 1;
        division.nChangeFollowing = d - 1;
        if (d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
          // Optimization: number of changes in reverse direction
          // is equal to number of items in following interval,
          // therefore it cannot contain any common items.
          division.aStartFollowing = aEnd;
          division.bStartFollowing = bEnd;
        } else {
          division.aStartFollowing = aStartFollowing;
          division.bStartFollowing = bStartFollowing;
        }
        return true;
      }
    }
  }
  return false;
};

// A complete function to extend reverse paths from (d - 1) to d changes.
// Return true if a path overlaps forward path of d changes in its diagonal.
const extendOverlappablePathsR = (
  d,
  aStart,
  aEnd,
  bStart,
  bEnd,
  isCommon,
  aIndexesF,
  iMaxF,
  aIndexesR,
  iMaxR,
  division // update prop values if return true
) => {
  const bR = bEnd - aEnd; // bIndex = bR + aIndex - kR
  const aLength = aEnd - aStart;
  const bLength = bEnd - bStart;
  const baDeltaLength = bLength - aLength; // kR = kF + baDeltaLength

  // Range of diagonals in which forward and reverse paths might overlap.
  const kMinOverlapR = baDeltaLength - d; // -d <= kF
  const kMaxOverlapR = baDeltaLength + d; // kF <= d

  let aIndexPrev1 = NOT_YET_SET; // prev value of [iR - 1] in next iteration

  // Optimization: skip diagonals in which paths cannot ever overlap.
  const nR = d < iMaxR ? d : iMaxR;

  // The diagonals kR = d - 2 * iR are odd when d is odd and even when d is even.
  for (let iR = 0, kR = d; iR <= nR; iR += 1, kR -= 2) {
    // To get first point of path segment, move one change in reverse direction
    // from last point of previous path segment in an adjacent diagonal.
    // In first iteration when iR === 0 and kR === d always insert.
    // In last possible iteration when iR === d and kR === -d always delete.
    const insert = iR === 0 || (iR !== d && aIndexesR[iR] < aIndexPrev1);
    const aLastPrev = insert ? aIndexesR[iR] : aIndexPrev1;
    const aFirst = insert
      ? aLastPrev // vertical to insert from b
      : aLastPrev - 1; // horizontal to delete from a

    // To get last point of path segment, move along diagonal of common items.
    const bFirst = bR + aFirst - kR;
    const nCommonR = countCommonItemsR(
      aStart,
      aFirst - 1,
      bStart,
      bFirst - 1,
      isCommon
    );
    const aLast = aFirst - nCommonR;
    aIndexPrev1 = aIndexesR[iR];
    aIndexesR[iR] = aLast;
    if (kMinOverlapR <= kR && kR <= kMaxOverlapR) {
      // Solve for iF of forward path with d changes in diagonal kR:
      // kF = kR - baDeltaLength
      // kF = 2 * iF - d
      const iF = (d + (kR - baDeltaLength)) / 2;

      // If this reverse path overlaps the forward path in this diagonal,
      // then this is a middle change of the index intervals.
      if (iF <= iMaxF && aLast - 1 <= aIndexesF[iF]) {
        const bLast = bFirst - nCommonR;
        division.nChangePreceding = d;
        if (d === aLast + bLast - aStart - bStart) {
          // Optimization: number of changes in reverse direction
          // is equal to number of items in preceding interval,
          // therefore it cannot contain any common items.
          division.aEndPreceding = aStart;
          division.bEndPreceding = bStart;
        } else {
          division.aEndPreceding = aLast;
          division.bEndPreceding = bLast;
        }
        division.nCommonPreceding = nCommonR;
        if (nCommonR !== 0) {
          // The last point of reverse path segment is start of common subsequence.
          division.aCommonPreceding = aLast;
          division.bCommonPreceding = bLast;
        }
        division.nChangeFollowing = d - 1;
        if (d === 1) {
          // There is no previous path segment.
          division.nCommonFollowing = 0;
          division.aStartFollowing = aEnd;
          division.bStartFollowing = bEnd;
        } else {
          // Unlike the Myers algorithm which finds only the middle “snake”
          // this package can find two common subsequences per division.
          // Last point of previous path segment is on an adjacent diagonal.
          const bLastPrev = bR + aLastPrev - (insert ? kR - 1 : kR + 1);

          // Because of invariant that intervals following the middle change
          // cannot have common items at the start,
          // move in forward direction along a diagonal of common items.
          const nCommonF = countCommonItemsF(
            aLastPrev,
            aEnd,
            bLastPrev,
            bEnd,
            isCommon
          );
          division.nCommonFollowing = nCommonF;
          if (nCommonF !== 0) {
            // The last point of reverse path segment is start of common subsequence.
            division.aCommonFollowing = aLastPrev;
            division.bCommonFollowing = bLastPrev;
          }
          const aStartFollowing = aLastPrev + nCommonF; // aFirstPrev
          const bStartFollowing = bLastPrev + nCommonF; // bFirstPrev

          if (d - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
            // Optimization: number of changes in forward direction
            // is equal to number of items in following interval,
            // therefore it cannot contain any common items.
            division.aStartFollowing = aEnd;
            division.bStartFollowing = bEnd;
          } else {
            division.aStartFollowing = aStartFollowing;
            division.bStartFollowing = bStartFollowing;
          }
        }
        return true;
      }
    }
  }
  return false;
};

// Given index intervals and input function to compare items at indexes,
// divide at the middle change.
//
// DO NOT CALL if start === end, because interval cannot contain common items
// and because this function will throw the “no overlap” error.
const divide = (
  nChange,
  aStart,
  aEnd,
  bStart,
  bEnd,
  isCommon,
  aIndexesF,
  aIndexesR,
  division // output
) => {
  const bF = bStart - aStart; // bIndex = bF + aIndex - kF
  const bR = bEnd - aEnd; // bIndex = bR + aIndex - kR
  const aLength = aEnd - aStart;
  const bLength = bEnd - bStart;

  // Because graph has square or portrait orientation,
  // length difference is minimum number of items to insert from b.
  // Corresponding forward and reverse diagonals in graph
  // depend on length difference of the sequences:
  // kF = kR - baDeltaLength
  // kR = kF + baDeltaLength
  const baDeltaLength = bLength - aLength;

  // Optimization: max diagonal in graph intersects corner of shorter side.
  let iMaxF = aLength;
  let iMaxR = aLength;

  // Initialize no changes yet in forward or reverse direction:
  aIndexesF[0] = aStart - 1; // at open start of interval, outside closed start
  aIndexesR[0] = aEnd; // at open end of interval

  if (baDeltaLength % 2 === 0) {
    // The number of changes in paths is 2 * d if length difference is even.
    const dMin = (nChange || baDeltaLength) / 2;
    const dMax = (aLength + bLength) / 2;
    for (let d = 1; d <= dMax; d += 1) {
      iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
      if (d < dMin) {
        iMaxR = extendPathsR(d, aStart, bStart, bR, isCommon, aIndexesR, iMaxR);
      } else if (
        // If a reverse path overlaps a forward path in the same diagonal,
        // return a division of the index intervals at the middle change.
        extendOverlappablePathsR(
          d,
          aStart,
          aEnd,
          bStart,
          bEnd,
          isCommon,
          aIndexesF,
          iMaxF,
          aIndexesR,
          iMaxR,
          division
        )
      ) {
        return;
      }
    }
  } else {
    // The number of changes in paths is 2 * d - 1 if length difference is odd.
    const dMin = ((nChange || baDeltaLength) + 1) / 2;
    const dMax = (aLength + bLength + 1) / 2;

    // Unroll first half iteration so loop extends the relevant pairs of paths.
    // Because of invariant that intervals have no common items at start or end,
    // and limitation not to call divide with empty intervals,
    // therefore it cannot be called if a forward path with one change
    // would overlap a reverse path with no changes, even if dMin === 1.
    let d = 1;
    iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
    for (d += 1; d <= dMax; d += 1) {
      iMaxR = extendPathsR(
        d - 1,
        aStart,
        bStart,
        bR,
        isCommon,
        aIndexesR,
        iMaxR
      );
      if (d < dMin) {
        iMaxF = extendPathsF(d, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
      } else if (
        // If a forward path overlaps a reverse path in the same diagonal,
        // return a division of the index intervals at the middle change.
        extendOverlappablePathsF(
          d,
          aStart,
          aEnd,
          bStart,
          bEnd,
          isCommon,
          aIndexesF,
          iMaxF,
          aIndexesR,
          iMaxR,
          division
        )
      ) {
        return;
      }
    }
  }

  /* istanbul ignore next */
  throw new Error(
    `${pkg}: no overlap aStart=${aStart} aEnd=${aEnd} bStart=${bStart} bEnd=${bEnd}`
  );
};

// Given index intervals and input function to compare items at indexes,
// return by output function the number of adjacent items and starting indexes
// of each common subsequence. Divide and conquer with only linear space.
//
// The index intervals are half open [start, end) like array slice method.
// DO NOT CALL if start === end, because interval cannot contain common items
// and because divide function will throw the “no overlap” error.
const findSubsequences = (
  nChange,
  aStart,
  aEnd,
  bStart,
  bEnd,
  transposed,
  callbacks,
  aIndexesF,
  aIndexesR,
  division // temporary memory, not input nor output
) => {
  if (bEnd - bStart < aEnd - aStart) {
    // Transpose graph so it has portrait instead of landscape orientation.
    // Always compare shorter to longer sequence for consistency and optimization.
    transposed = !transposed;
    if (transposed && callbacks.length === 1) {
      // Lazily wrap callback functions to swap args if graph is transposed.
      const {foundSubsequence, isCommon} = callbacks[0];
      callbacks[1] = {
        foundSubsequence: (nCommon, bCommon, aCommon) => {
          foundSubsequence(nCommon, aCommon, bCommon);
        },
        isCommon: (bIndex, aIndex) => isCommon(aIndex, bIndex)
      };
    }
    const tStart = aStart;
    const tEnd = aEnd;
    aStart = bStart;
    aEnd = bEnd;
    bStart = tStart;
    bEnd = tEnd;
  }
  const {foundSubsequence, isCommon} = callbacks[transposed ? 1 : 0];

  // Divide the index intervals at the middle change.
  divide(
    nChange,
    aStart,
    aEnd,
    bStart,
    bEnd,
    isCommon,
    aIndexesF,
    aIndexesR,
    division
  );
  const {
    nChangePreceding,
    aEndPreceding,
    bEndPreceding,
    nCommonPreceding,
    aCommonPreceding,
    bCommonPreceding,
    nCommonFollowing,
    aCommonFollowing,
    bCommonFollowing,
    nChangeFollowing,
    aStartFollowing,
    bStartFollowing
  } = division;

  // Unless either index interval is empty, they might contain common items.
  if (aStart < aEndPreceding && bStart < bEndPreceding) {
    // Recursely find and return common subsequences preceding the division.
    findSubsequences(
      nChangePreceding,
      aStart,
      aEndPreceding,
      bStart,
      bEndPreceding,
      transposed,
      callbacks,
      aIndexesF,
      aIndexesR,
      division
    );
  }

  // Return common subsequences that are adjacent to the middle change.
  if (nCommonPreceding !== 0) {
    foundSubsequence(nCommonPreceding, aCommonPreceding, bCommonPreceding);
  }
  if (nCommonFollowing !== 0) {
    foundSubsequence(nCommonFollowing, aCommonFollowing, bCommonFollowing);
  }

  // Unless either index interval is empty, they might contain common items.
  if (aStartFollowing < aEnd && bStartFollowing < bEnd) {
    // Recursely find and return common subsequences following the division.
    findSubsequences(
      nChangeFollowing,
      aStartFollowing,
      aEnd,
      bStartFollowing,
      bEnd,
      transposed,
      callbacks,
      aIndexesF,
      aIndexesR,
      division
    );
  }
};
const validateLength = (name, arg) => {
  if (typeof arg !== 'number') {
    throw new TypeError(`${pkg}: ${name} typeof ${typeof arg} is not a number`);
  }
  if (!Number.isSafeInteger(arg)) {
    throw new RangeError(`${pkg}: ${name} value ${arg} is not a safe integer`);
  }
  if (arg < 0) {
    throw new RangeError(`${pkg}: ${name} value ${arg} is a negative integer`);
  }
};
const validateCallback = (name, arg) => {
  const type = typeof arg;
  if (type !== 'function') {
    throw new TypeError(`${pkg}: ${name} typeof ${type} is not a function`);
  }
};

// Compare items in two sequences to find a longest common subsequence.
// Given lengths of sequences and input function to compare items at indexes,
// return by output function the number of adjacent items and starting indexes
// of each common subsequence.
function diffSequence(aLength, bLength, isCommon, foundSubsequence) {
  validateLength('aLength', aLength);
  validateLength('bLength', bLength);
  validateCallback('isCommon', isCommon);
  validateCallback('foundSubsequence', foundSubsequence);

  // Count common items from the start in the forward direction.
  const nCommonF = countCommonItemsF(0, aLength, 0, bLength, isCommon);
  if (nCommonF !== 0) {
    foundSubsequence(nCommonF, 0, 0);
  }

  // Unless both sequences consist of common items only,
  // find common items in the half-trimmed index intervals.
  if (aLength !== nCommonF || bLength !== nCommonF) {
    // Invariant: intervals do not have common items at the start.
    // The start of an index interval is closed like array slice method.
    const aStart = nCommonF;
    const bStart = nCommonF;

    // Count common items from the end in the reverse direction.
    const nCommonR = countCommonItemsR(
      aStart,
      aLength - 1,
      bStart,
      bLength - 1,
      isCommon
    );

    // Invariant: intervals do not have common items at the end.
    // The end of an index interval is open like array slice method.
    const aEnd = aLength - nCommonR;
    const bEnd = bLength - nCommonR;

    // Unless one sequence consists of common items only,
    // therefore the other trimmed index interval consists of changes only,
    // find common items in the trimmed index intervals.
    const nCommonFR = nCommonF + nCommonR;
    if (aLength !== nCommonFR && bLength !== nCommonFR) {
      const nChange = 0; // number of change items is not yet known
      const transposed = false; // call the original unwrapped functions
      const callbacks = [
        {
          foundSubsequence,
          isCommon
        }
      ];

      // Indexes in sequence a of last points in furthest reaching paths
      // from outside the start at top left in the forward direction:
      const aIndexesF = [NOT_YET_SET];
      // from the end at bottom right in the reverse direction:
      const aIndexesR = [NOT_YET_SET];

      // Initialize one object as output of all calls to divide function.
      const division = {
        aCommonFollowing: NOT_YET_SET,
        aCommonPreceding: NOT_YET_SET,
        aEndPreceding: NOT_YET_SET,
        aStartFollowing: NOT_YET_SET,
        bCommonFollowing: NOT_YET_SET,
        bCommonPreceding: NOT_YET_SET,
        bEndPreceding: NOT_YET_SET,
        bStartFollowing: NOT_YET_SET,
        nChangeFollowing: NOT_YET_SET,
        nChangePreceding: NOT_YET_SET,
        nCommonFollowing: NOT_YET_SET,
        nCommonPreceding: NOT_YET_SET
      };

      // Find and return common subsequences in the trimmed index intervals.
      findSubsequences(
        nChange,
        aStart,
        aEnd,
        bStart,
        bEnd,
        transposed,
        callbacks,
        aIndexesF,
        aIndexesR,
        division
      );
    }
    if (nCommonR !== 0) {
      foundSubsequence(nCommonR, aEnd, bEnd);
    }
  }
}
