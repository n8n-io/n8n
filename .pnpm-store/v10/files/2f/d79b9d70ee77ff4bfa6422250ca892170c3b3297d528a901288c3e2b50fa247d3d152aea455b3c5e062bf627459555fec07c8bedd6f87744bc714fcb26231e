'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = timesSeries;

var _timesLimit = require('./timesLimit.js');

var _timesLimit2 = _interopRequireDefault(_timesLimit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
 *
 * @name timesSeries
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} n - The number of times to run the function.
 * @param {AsyncFunction} iteratee - The async function to call `n` times.
 * Invoked with the iteration index and a callback: (n, next).
 * @param {Function} callback - see {@link module:Collections.map}.
 * @returns {Promise} a promise, if no callback is provided
 */
function timesSeries(n, iteratee, callback) {
  return (0, _timesLimit2.default)(n, 1, iteratee, callback);
}
module.exports = exports['default'];