'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _cleanupSemantic = require('./cleanupSemantic');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Given change op and array of diffs, return concatenated string:
// * include common strings
// * include change strings which have argument op with changeColor
// * exclude change strings which have opposite op
const concatenateRelevantDiffs = (op, diffs, changeColor) =>
  diffs.reduce(
    (reduced, diff) =>
      reduced +
      (diff[0] === _cleanupSemantic.DIFF_EQUAL
        ? diff[1]
        : diff[0] === op && diff[1].length !== 0 // empty if change is newline
        ? changeColor(diff[1])
        : ''),
    ''
  );

// Encapsulate change lines until either a common newline or the end.
class ChangeBuffer {
  op;
  line; // incomplete line
  lines; // complete lines
  changeColor;
  constructor(op, changeColor) {
    this.op = op;
    this.line = [];
    this.lines = [];
    this.changeColor = changeColor;
  }
  pushSubstring(substring) {
    this.pushDiff(new _cleanupSemantic.Diff(this.op, substring));
  }
  pushLine() {
    // Assume call only if line has at least one diff,
    // therefore an empty line must have a diff which has an empty string.

    // If line has multiple diffs, then assume it has a common diff,
    // therefore change diffs have change color;
    // otherwise then it has line color only.
    this.lines.push(
      this.line.length !== 1
        ? new _cleanupSemantic.Diff(
            this.op,
            concatenateRelevantDiffs(this.op, this.line, this.changeColor)
          )
        : this.line[0][0] === this.op
        ? this.line[0] // can use instance
        : new _cleanupSemantic.Diff(this.op, this.line[0][1]) // was common diff
    );

    this.line.length = 0;
  }
  isLineEmpty() {
    return this.line.length === 0;
  }

  // Minor input to buffer.
  pushDiff(diff) {
    this.line.push(diff);
  }

  // Main input to buffer.
  align(diff) {
    const string = diff[1];
    if (string.includes('\n')) {
      const substrings = string.split('\n');
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        if (i < iLast) {
          // The first substring completes the current change line.
          // A middle substring is a change line.
          this.pushSubstring(substring);
          this.pushLine();
        } else if (substring.length !== 0) {
          // The last substring starts a change line, if it is not empty.
          // Important: This non-empty condition also automatically omits
          // the newline appended to the end of expected and received strings.
          this.pushSubstring(substring);
        }
      });
    } else {
      // Append non-multiline string to current change line.
      this.pushDiff(diff);
    }
  }

  // Output from buffer.
  moveLinesTo(lines) {
    if (!this.isLineEmpty()) {
      this.pushLine();
    }
    lines.push(...this.lines);
    this.lines.length = 0;
  }
}

// Encapsulate common and change lines.
class CommonBuffer {
  deleteBuffer;
  insertBuffer;
  lines;
  constructor(deleteBuffer, insertBuffer) {
    this.deleteBuffer = deleteBuffer;
    this.insertBuffer = insertBuffer;
    this.lines = [];
  }
  pushDiffCommonLine(diff) {
    this.lines.push(diff);
  }
  pushDiffChangeLines(diff) {
    const isDiffEmpty = diff[1].length === 0;

    // An empty diff string is redundant, unless a change line is empty.
    if (!isDiffEmpty || this.deleteBuffer.isLineEmpty()) {
      this.deleteBuffer.pushDiff(diff);
    }
    if (!isDiffEmpty || this.insertBuffer.isLineEmpty()) {
      this.insertBuffer.pushDiff(diff);
    }
  }
  flushChangeLines() {
    this.deleteBuffer.moveLinesTo(this.lines);
    this.insertBuffer.moveLinesTo(this.lines);
  }

  // Input to buffer.
  align(diff) {
    const op = diff[0];
    const string = diff[1];
    if (string.includes('\n')) {
      const substrings = string.split('\n');
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i) => {
        if (i === 0) {
          const subdiff = new _cleanupSemantic.Diff(op, substring);
          if (
            this.deleteBuffer.isLineEmpty() &&
            this.insertBuffer.isLineEmpty()
          ) {
            // If both current change lines are empty,
            // then the first substring is a common line.
            this.flushChangeLines();
            this.pushDiffCommonLine(subdiff);
          } else {
            // If either current change line is non-empty,
            // then the first substring completes the change lines.
            this.pushDiffChangeLines(subdiff);
            this.flushChangeLines();
          }
        } else if (i < iLast) {
          // A middle substring is a common line.
          this.pushDiffCommonLine(new _cleanupSemantic.Diff(op, substring));
        } else if (substring.length !== 0) {
          // The last substring starts a change line, if it is not empty.
          // Important: This non-empty condition also automatically omits
          // the newline appended to the end of expected and received strings.
          this.pushDiffChangeLines(new _cleanupSemantic.Diff(op, substring));
        }
      });
    } else {
      // Append non-multiline string to current change lines.
      // Important: It cannot be at the end following empty change lines,
      // because newline appended to the end of expected and received strings.
      this.pushDiffChangeLines(diff);
    }
  }

  // Output from buffer.
  getLines() {
    this.flushChangeLines();
    return this.lines;
  }
}

// Given diffs from expected and received strings,
// return new array of diffs split or joined into lines.
//
// To correctly align a change line at the end, the algorithm:
// * assumes that a newline was appended to the strings
// * omits the last newline from the output array
//
// Assume the function is not called:
// * if either expected or received is empty string
// * if neither expected nor received is multiline string
const getAlignedDiffs = (diffs, changeColor) => {
  const deleteBuffer = new ChangeBuffer(
    _cleanupSemantic.DIFF_DELETE,
    changeColor
  );
  const insertBuffer = new ChangeBuffer(
    _cleanupSemantic.DIFF_INSERT,
    changeColor
  );
  const commonBuffer = new CommonBuffer(deleteBuffer, insertBuffer);
  diffs.forEach(diff => {
    switch (diff[0]) {
      case _cleanupSemantic.DIFF_DELETE:
        deleteBuffer.align(diff);
        break;
      case _cleanupSemantic.DIFF_INSERT:
        insertBuffer.align(diff);
        break;
      default:
        commonBuffer.align(diff);
    }
  });
  return commonBuffer.getLines();
};
var _default = getAlignedDiffs;
exports.default = _default;
