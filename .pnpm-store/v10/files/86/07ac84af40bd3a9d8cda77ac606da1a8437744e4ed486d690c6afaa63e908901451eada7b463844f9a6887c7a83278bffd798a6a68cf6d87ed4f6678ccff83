'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = timesLimit;

var _mapLimit = require('./mapLimit.js');

var _mapLimit2 = _interopRequireDefault(_mapLimit);

var _range = require('./internal/range.js');

var _range2 = _interopRequireDefault(_range);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name timesLimit
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.times]{@link module:ControlFlow.times}
 * @category Control Flow
 * @param {number} count - The number of times to run the function.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - The async function to call `n` times.
 * Invoked with the iteration index and a callback: (n, next).
 * @param {Function} callback - see [async.map]{@link module:Collections.map}.
 * @returns {Promise} a promise, if no callback is provided
 */
function timesLimit(count, limit, iteratee, callback) {
    var _iteratee = (0, _wrapAsync2.default)(iteratee);
    return (0, _mapLimit2.default)((0, _range2.default)(count), limit, _iteratee, callback);
}
module.exports = exports.default;