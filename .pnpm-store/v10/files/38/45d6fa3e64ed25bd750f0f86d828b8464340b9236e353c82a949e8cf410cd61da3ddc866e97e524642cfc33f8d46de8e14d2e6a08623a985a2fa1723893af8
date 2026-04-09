'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _filter2 = require('./internal/filter.js');

var _filter3 = _interopRequireDefault(_filter2);

var _eachOfSeries = require('./eachOfSeries.js');

var _eachOfSeries2 = _interopRequireDefault(_eachOfSeries);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
 *
 * @name filterSeries
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @alias selectSeries
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results)
 * @returns {Promise} a promise, if no callback provided
 */
function filterSeries(coll, iteratee, callback) {
    return (0, _filter3.default)(_eachOfSeries2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(filterSeries, 3);
module.exports = exports.default;