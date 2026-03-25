'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createTester = require('./internal/createTester.js');

var _createTester2 = _interopRequireDefault(_createTester);

var _eachOfLimit = require('./internal/eachOfLimit.js');

var _eachOfLimit2 = _interopRequireDefault(_eachOfLimit);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
 *
 * @name everyLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.every]{@link module:Collections.every}
 * @alias allLimit
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {AsyncFunction} iteratee - An async truth test to apply to each item
 * in the collection in parallel.
 * The iteratee must complete with a boolean result value.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result will be either `true` or `false`
 * depending on the values of the async tests. Invoked with (err, result).
 * @returns {Promise} a promise, if no callback provided
 */
function everyLimit(coll, limit, iteratee, callback) {
  return (0, _createTester2.default)(bool => !bool, res => !res)((0, _eachOfLimit2.default)(limit), coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(everyLimit, 4);
module.exports = exports['default'];