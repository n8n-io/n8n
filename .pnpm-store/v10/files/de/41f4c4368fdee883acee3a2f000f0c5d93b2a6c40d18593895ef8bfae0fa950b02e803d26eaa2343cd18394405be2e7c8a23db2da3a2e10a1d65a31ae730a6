'use strict';

var math = require('./math-96d5e8c4.cjs');

/**
 * Utility helpers for generating statistics.
 *
 * @module statistics
 */

/**
 * @param {Array<number>} arr Array of values
 * @return {number} Returns null if the array is empty
 */
const median = arr => arr.length === 0 ? NaN : (arr.length % 2 === 1 ? arr[(arr.length - 1) / 2] : (arr[math.floor((arr.length - 1) / 2)] + arr[math.ceil((arr.length - 1) / 2)]) / 2);

/**
 * @param {Array<number>} arr
 * @return {number}
 */
const average = arr => arr.reduce(math.add, 0) / arr.length;

var statistics = /*#__PURE__*/Object.freeze({
	__proto__: null,
	median: median,
	average: average
});

exports.average = average;
exports.median = median;
exports.statistics = statistics;
//# sourceMappingURL=statistics-65f6114b.cjs.map
