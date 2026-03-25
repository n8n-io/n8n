'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = wrapAnsiString;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// word-wrap a string that contains ANSI escape sequences.
// ANSI escape sequences do not add to the string length.
function wrapAnsiString(string, terminalWidth) {
  if (terminalWidth === 0) {
    // if the terminal width is zero, don't bother word-wrapping
    return string;
  }
  const ANSI_REGEXP = /[\u001b\u009b]\[\d{1,2}m/gu;
  const tokens = [];
  let lastIndex = 0;
  let match;
  while ((match = ANSI_REGEXP.exec(string))) {
    const ansi = match[0];
    const index = match.index;
    if (index != lastIndex) {
      tokens.push(['string', string.slice(lastIndex, index)]);
    }
    tokens.push(['ansi', ansi]);
    lastIndex = index + ansi.length;
  }
  if (lastIndex != string.length - 1) {
    tokens.push(['string', string.slice(lastIndex, string.length)]);
  }
  let lastLineLength = 0;
  return tokens
    .reduce(
      (lines, [kind, token]) => {
        if (kind === 'string') {
          if (lastLineLength + token.length > terminalWidth) {
            while (token.length) {
              const chunk = token.slice(0, terminalWidth - lastLineLength);
              const remaining = token.slice(
                terminalWidth - lastLineLength,
                token.length
              );
              lines[lines.length - 1] += chunk;
              lastLineLength += chunk.length;
              token = remaining;
              if (token.length) {
                lines.push('');
                lastLineLength = 0;
              }
            }
          } else {
            lines[lines.length - 1] += token;
            lastLineLength += token.length;
          }
        } else {
          lines[lines.length - 1] += token;
        }
        return lines;
      },
      ['']
    )
    .join('\n');
}
