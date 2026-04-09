'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _map2 = require('./internal/map.js');

var _map3 = _interopRequireDefault(_map2);

var _eachOfSeries = require('./eachOfSeries.js');

var _eachOfSeries2 = _interopRequireDefault(_eachOfSeries);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
 *
 * @name mapSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.map]{@link module:Collections.map}
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - An async function to apply to each item in
 * `coll`.
 * The iteratee should complete with the transformed item.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called when all `iteratee`
 * functions have finished, or an error occurs. Results is an array of the
 * transformed items from the `coll`. Invoked with (err, results).
 * @returns {Promise} a promise, if no callback is passed
 */
function mapSeries(coll, iteratee, callback) {
    return (0, _map3.default)(_eachOfSeries2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(mapSeries, 3);
module.exports = exports.default;