'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _applyEach = require('./internal/applyEach.js');

var _applyEach2 = _interopRequireDefault(_applyEach);

var _map = require('./map.js');

var _map2 = _interopRequireDefault(_map);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Applies the provided arguments to each function in the array, calling
 * `callback` after all functions have completed. If you only provide the first
 * argument, `fns`, then it will return a function which lets you pass in the
 * arguments as if it were a single function call. If more arguments are
 * provided, `callback` is required while `args` is still optional. The results
 * for each of the applied async functions are passed to the final callback
 * as an array.
 *
 * @name applyEach
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s
 * to all call with the same arguments
 * @param {...*} [args] - any number of separate arguments to pass to the
 * function.
 * @param {Function} [callback] - the final argument should be the callback,
 * called when all functions have completed processing.
 * @returns {AsyncFunction} - Returns a function that takes no args other than
 * an optional callback, that is the result of applying the `args` to each
 * of the functions.
 * @example
 *
 * const appliedFn = async.applyEach([enableSearch, updateSchema], 'bucket')
 *
 * appliedFn((err, results) => {
 *     // results[0] is the results for `enableSearch`
 *     // results[1] is the results for `updateSchema`
 * });
 *
 * // partial application example:
 * async.each(
 *     buckets,
 *     async (bucket) => async.applyEach([enableSearch, updateSchema], bucket)(),
 *     callback
 * );
 */
exports.default = (0, _applyEach2.default)(_map2.default);
module.exports = exports['default'];