'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _reject2 = require('./internal/reject.js');

var _reject3 = _interopRequireDefault(_reject2);

var _eachOfSeries = require('./eachOfSeries.js');

var _eachOfSeries2 = _interopRequireDefault(_eachOfSeries);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
 *
 * @name rejectSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.reject]{@link module:Collections.reject}
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - An async truth test to apply to each item in
 * `coll`.
 * The should complete with a boolean value as its `result`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @returns {Promise} a promise, if no callback is passed
 */
function rejectSeries(coll, iteratee, callback) {
    return (0, _reject3.default)(_eachOfSeries2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(rejectSeries, 3);
module.exports = exports.default;