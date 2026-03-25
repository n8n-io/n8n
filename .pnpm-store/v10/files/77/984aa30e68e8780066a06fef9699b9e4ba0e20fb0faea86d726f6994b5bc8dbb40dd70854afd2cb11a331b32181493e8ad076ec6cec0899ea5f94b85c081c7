'use strict';

/**
 * Common Math expressions.
 *
 * @module math
 */

const floor = Math.floor;
const ceil = Math.ceil;
const abs = Math.abs;
const imul = Math.imul;
const round = Math.round;
const log10 = Math.log10;
const log2 = Math.log2;
const log = Math.log;
const sqrt = Math.sqrt;

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The sum of a and b
 */
const add = (a, b) => a + b;

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The smaller element of a and b
 */
const min = (a, b) => a < b ? a : b;

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The bigger element of a and b
 */
const max = (a, b) => a > b ? a : b;

const isNaN = Number.isNaN;

const pow = Math.pow;
/**
 * Base 10 exponential function. Returns the value of 10 raised to the power of pow.
 *
 * @param {number} exp
 * @return {number}
 */
const exp10 = exp => Math.pow(10, exp);

const sign = Math.sign;

/**
 * Check whether n is negative, while considering the -0 edge case. While `-0 < 0` is false, this
 * function returns true for -0,-1,,.. and returns false for 0,1,2,...
 * @param {number} n
 * @return {boolean} Wether n is negative. This function also distinguishes between -0 and +0
 */
const isNegativeZero = n => n !== 0 ? n < 0 : 1 / n < 0;

var math = /*#__PURE__*/Object.freeze({
	__proto__: null,
	floor: floor,
	ceil: ceil,
	abs: abs,
	imul: imul,
	round: round,
	log10: log10,
	log2: log2,
	log: log,
	sqrt: sqrt,
	add: add,
	min: min,
	max: max,
	isNaN: isNaN,
	pow: pow,
	exp10: exp10,
	sign: sign,
	isNegativeZero: isNegativeZero
});

exports.abs = abs;
exports.add = add;
exports.ceil = ceil;
exports.exp10 = exp10;
exports.floor = floor;
exports.imul = imul;
exports.isNaN = isNaN;
exports.isNegativeZero = isNegativeZero;
exports.log = log;
exports.log10 = log10;
exports.log2 = log2;
exports.math = math;
exports.max = max;
exports.min = min;
exports.pow = pow;
exports.round = round;
exports.sign = sign;
exports.sqrt = sqrt;
//# sourceMappingURL=math-96d5e8c4.cjs.map
