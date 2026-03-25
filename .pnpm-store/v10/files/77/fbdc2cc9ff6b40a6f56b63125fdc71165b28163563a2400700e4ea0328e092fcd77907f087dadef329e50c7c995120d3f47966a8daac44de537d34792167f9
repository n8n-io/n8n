'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Converts a string representing an amount of memory to bytes.
 *
 * @param input The value to convert to bytes.
 * @param percentageReference The reference value to use when a '%' value is supplied.
 */
function stringToBytes(input, percentageReference) {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === 'string') {
    if (isNaN(Number.parseFloat(input.slice(-1)))) {
      // eslint-disable-next-line prefer-const
      let [, numericString, trailingChars] =
        input.match(/(.*?)([^0-9.-]+)$/i) || [];
      if (trailingChars && numericString) {
        const numericValue = Number.parseFloat(numericString);
        trailingChars = trailingChars.toLowerCase();
        switch (trailingChars) {
          case '%':
            input = numericValue / 100;
            break;
          case 'kb':
          case 'k':
            return numericValue * 1000;
          case 'kib':
            return numericValue * 1024;
          case 'mb':
          case 'm':
            return numericValue * 1000 * 1000;
          case 'mib':
            return numericValue * 1024 * 1024;
          case 'gb':
          case 'g':
            return numericValue * 1000 * 1000 * 1000;
          case 'gib':
            return numericValue * 1024 * 1024 * 1024;
        }
      }

      // It ends in some kind of char so we need to do some parsing
    } else {
      input = Number.parseFloat(input);
    }
  }
  if (typeof input === 'number') {
    if (input <= 1 && input > 0) {
      if (percentageReference) {
        return Math.floor(input * percentageReference);
      } else {
        throw new Error(
          'For a percentage based memory limit a percentageReference must be supplied'
        );
      }
    } else if (input > 1) {
      return Math.floor(input);
    } else {
      throw new Error('Unexpected numerical input');
    }
  }
  throw new Error('Unexpected input');
}

// https://github.com/import-js/eslint-plugin-import/issues/1590
var _default = stringToBytes;
exports.default = _default;
