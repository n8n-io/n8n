/**
 * Utility helpers for generating statistics.
 *
 * @module statistics
 */

import * as math from './math.js'

/**
 * @param {Array<number>} arr Array of values
 * @return {number} Returns null if the array is empty
 */
export const median = arr => arr.length === 0 ? NaN : (arr.length % 2 === 1 ? arr[(arr.length - 1) / 2] : (arr[math.floor((arr.length - 1) / 2)] + arr[math.ceil((arr.length - 1) / 2)]) / 2)

/**
 * @param {Array<number>} arr
 * @return {number}
 */
export const average = arr => arr.reduce(math.add, 0) / arr.length
