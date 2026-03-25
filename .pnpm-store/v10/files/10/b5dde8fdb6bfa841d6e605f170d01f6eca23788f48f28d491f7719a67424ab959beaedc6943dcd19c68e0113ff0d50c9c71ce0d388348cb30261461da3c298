'use strict';

var math = require('./math-96d5e8c4.cjs');
var binary = require('./binary-ac8e39e2.cjs');

/**
 * Utility helpers for working with numbers.
 *
 * @module number
 */

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;

const LOWEST_INT32 = 1 << 31;
const HIGHEST_INT32 = binary.BITS31;
const HIGHEST_UINT32 = binary.BITS32;

/* c8 ignore next */
const isInteger = Number.isInteger || (num => typeof num === 'number' && isFinite(num) && math.floor(num) === num);
const isNaN = Number.isNaN;
const parseInt = Number.parseInt;

/**
 * Count the number of "1" bits in an unsigned 32bit number.
 *
 * Super fun bitcount algorithm by Brian Kernighan.
 *
 * @param {number} n
 */
const countBits = n => {
  n &= binary.BITS32;
  let count = 0;
  while (n) {
    n &= (n - 1);
    count++;
  }
  return count
};

var number = /*#__PURE__*/Object.freeze({
  __proto__: null,
  MAX_SAFE_INTEGER: MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER: MIN_SAFE_INTEGER,
  LOWEST_INT32: LOWEST_INT32,
  HIGHEST_INT32: HIGHEST_INT32,
  HIGHEST_UINT32: HIGHEST_UINT32,
  isInteger: isInteger,
  isNaN: isNaN,
  parseInt: parseInt,
  countBits: countBits
});

exports.HIGHEST_INT32 = HIGHEST_INT32;
exports.HIGHEST_UINT32 = HIGHEST_UINT32;
exports.LOWEST_INT32 = LOWEST_INT32;
exports.MAX_SAFE_INTEGER = MAX_SAFE_INTEGER;
exports.MIN_SAFE_INTEGER = MIN_SAFE_INTEGER;
exports.countBits = countBits;
exports.isInteger = isInteger;
exports.isNaN = isNaN;
exports.number = number;
exports.parseInt = parseInt;
//# sourceMappingURL=number-1fb57bba.cjs.map
