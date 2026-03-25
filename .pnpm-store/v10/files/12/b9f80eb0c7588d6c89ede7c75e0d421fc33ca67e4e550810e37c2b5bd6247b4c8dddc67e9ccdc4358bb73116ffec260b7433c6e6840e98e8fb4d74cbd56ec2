'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.dedentLines = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const getIndentationLength = line => {
  const result = /^( {2})+/.exec(line);
  return result === null ? 0 : result[0].length;
};
const dedentLine = line => line.slice(getIndentationLength(line));

// Return true if:
// "key": "value has multiple lines\n…
// "key has multiple lines\n…
const hasUnmatchedDoubleQuoteMarks = string => {
  let n = 0;
  let i = string.indexOf('"', 0);
  while (i !== -1) {
    if (i === 0 || string[i - 1] !== '\\') {
      n += 1;
    }
    i = string.indexOf('"', i + 1);
  }
  return n % 2 !== 0;
};
const isFirstLineOfTag = line => /^( {2})*</.test(line);

// The length of the output array is the index of the next input line.

// Push dedented lines of start tag onto output and return true;
// otherwise return false because:
// * props include a multiline string (or text node, if props have markup)
// * start tag does not close
const dedentStartTag = (input, output) => {
  let line = input[output.length];
  output.push(dedentLine(line));
  if (line.includes('>')) {
    return true;
  }
  while (output.length < input.length) {
    line = input[output.length];
    if (hasUnmatchedDoubleQuoteMarks(line)) {
      return false; // because props include a multiline string
    } else if (isFirstLineOfTag(line)) {
      // Recursion only if props have markup.
      if (!dedentMarkup(input, output)) {
        return false;
      }
    } else {
      output.push(dedentLine(line));
      if (line.includes('>')) {
        return true;
      }
    }
  }
  return false;
};

// Push dedented lines of markup onto output and return true;
// otherwise return false because:
// * props include a multiline string
// * text has more than one adjacent line
// * markup does not close
const dedentMarkup = (input, output) => {
  let line = input[output.length];
  if (!dedentStartTag(input, output)) {
    return false;
  }
  if (input[output.length - 1].includes('/>')) {
    return true;
  }
  let isText = false;
  const stack = [];
  stack.push(getIndentationLength(line));
  while (stack.length > 0 && output.length < input.length) {
    line = input[output.length];
    if (isFirstLineOfTag(line)) {
      if (line.includes('</')) {
        output.push(dedentLine(line));
        stack.pop();
      } else {
        if (!dedentStartTag(input, output)) {
          return false;
        }
        if (!input[output.length - 1].includes('/>')) {
          stack.push(getIndentationLength(line));
        }
      }
      isText = false;
    } else {
      if (isText) {
        return false; // because text has more than one adjacent line
      }

      const indentationLengthOfTag = stack[stack.length - 1];
      output.push(line.slice(indentationLengthOfTag + 2));
      isText = true;
    }
  }
  return stack.length === 0;
};

// Return lines unindented by heuristic;
// otherwise return null because:
// * props include a multiline string
// * text has more than one adjacent line
// * markup does not close
const dedentLines = input => {
  const output = [];
  while (output.length < input.length) {
    const line = input[output.length];
    if (hasUnmatchedDoubleQuoteMarks(line)) {
      return null;
    } else if (isFirstLineOfTag(line)) {
      if (!dedentMarkup(input, output)) {
        return null;
      }
    } else {
      output.push(dedentLine(line));
    }
  }
  return output;
};
exports.dedentLines = dedentLines;
