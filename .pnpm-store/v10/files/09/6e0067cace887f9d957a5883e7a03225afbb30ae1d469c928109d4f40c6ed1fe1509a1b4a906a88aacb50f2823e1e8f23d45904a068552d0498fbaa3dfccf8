'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = groupBySeries;

var _groupByLimit = require('./groupByLimit.js');

var _groupByLimit2 = _interopRequireDefault(_groupByLimit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
 *
 * @name groupBySeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.groupBy]{@link module:Collections.groupBy}
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with a `key` to group the value under.
 * Invoked with (value, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Result is an `Object` whose
 * properties are arrays of values which returned the corresponding key.
 * @returns {Promise} a promise, if no callback is passed
 */
function groupBySeries(coll, iteratee, callback) {
    return (0, _groupByLimit2.default)(coll, 1, iteratee, callback);
}
module.exports = exports.default;