'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = mapValuesSeries;

var _mapValuesLimit = require('./mapValuesLimit.js');

var _mapValuesLimit2 = _interopRequireDefault(_mapValuesLimit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
 *
 * @name mapValuesSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.mapValues]{@link module:Collections.mapValues}
 * @category Collection
 * @param {Object} obj - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A function to apply to each value and key
 * in `coll`.
 * The iteratee should complete with the transformed value as its result.
 * Invoked with (value, key, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. `result` is a new object consisting
 * of each key from `obj`, with each transformed value on the right-hand side.
 * Invoked with (err, result).
 * @returns {Promise} a promise, if no callback is passed
 */
function mapValuesSeries(obj, iteratee, callback) {
    return (0, _mapValuesLimit2.default)(obj, 1, iteratee, callback);
}
module.exports = exports.default;