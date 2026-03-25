/**
 * Common Math expressions.
 *
 * @module math
 */

export const floor = Math.floor
export const ceil = Math.ceil
export const abs = Math.abs
export const imul = Math.imul
export const round = Math.round
export const log10 = Math.log10
export const log2 = Math.log2
export const log = Math.log
export const sqrt = Math.sqrt

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The sum of a and b
 */
export const add = (a, b) => a + b

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The smaller element of a and b
 */
export const min = (a, b) => a < b ? a : b

/**
 * @function
 * @param {number} a
 * @param {number} b
 * @return {number} The bigger element of a and b
 */
export const max = (a, b) => a > b ? a : b

export const isNaN = Number.isNaN

export const pow = Math.pow
/**
 * Base 10 exponential function. Returns the value of 10 raised to the power of pow.
 *
 * @param {number} exp
 * @return {number}
 */
export const exp10 = exp => Math.pow(10, exp)

export const sign = Math.sign

/**
 * Check whether n is negative, while considering the -0 edge case. While `-0 < 0` is false, this
 * function returns true for -0,-1,,.. and returns false for 0,1,2,...
 * @param {number} n
 * @return {boolean} Wether n is negative. This function also distinguishes between -0 and +0
 */
export const isNegativeZero = n => n !== 0 ? n < 0 : 1 / n < 0
