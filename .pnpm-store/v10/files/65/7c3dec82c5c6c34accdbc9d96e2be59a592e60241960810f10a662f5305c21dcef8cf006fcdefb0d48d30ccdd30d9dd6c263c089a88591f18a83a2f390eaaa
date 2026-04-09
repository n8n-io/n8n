'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _eachOfSeries = require('./eachOfSeries.js');

var _eachOfSeries2 = _interopRequireDefault(_eachOfSeries);

var _once = require('./internal/once.js');

var _once2 = _interopRequireDefault(_once);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Reduces `coll` into a single value using an async `iteratee` to return each
 * successive step. `memo` is the initial state of the reduction. This function
 * only operates in series.
 *
 * For performance reasons, it may make sense to split a call to this function
 * into a parallel map, and then use the normal `Array.prototype.reduce` on the
 * results. This function is for situations where each step in the reduction
 * needs to be async; if you can get the data before reducing it, then it's
 * probably a good idea to do so.
 *
 * @name reduce
 * @static
 * @memberOf module:Collections
 * @method
 * @alias inject
 * @alias foldl
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {*} memo - The initial state of the reduction.
 * @param {AsyncFunction} iteratee - A function applied to each item in the
 * array to produce the next step in the reduction.
 * The `iteratee` should complete with the next state of the reduction.
 * If the iteratee completes with an error, the reduction is stopped and the
 * main `callback` is immediately called with the error.
 * Invoked with (memo, item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the reduced value. Invoked with
 * (err, result).
 * @returns {Promise} a promise, if no callback is passed
 * @example
 *
 * // file1.txt is a file that is 1000 bytes in size
 * // file2.txt is a file that is 2000 bytes in size
 * // file3.txt is a file that is 3000 bytes in size
 * // file4.txt does not exist
 *
 * const fileList = ['file1.txt','file2.txt','file3.txt'];
 * const withMissingFileList = ['file1.txt','file2.txt','file3.txt', 'file4.txt'];
 *
 * // asynchronous function that computes the file size in bytes
 * // file size is added to the memoized value, then returned
 * function getFileSizeInBytes(memo, file, callback) {
 *     fs.stat(file, function(err, stat) {
 *         if (err) {
 *             return callback(err);
 *         }
 *         callback(null, memo + stat.size);
 *     });
 * }
 *
 * // Using callbacks
 * async.reduce(fileList, 0, getFileSizeInBytes, function(err, result) {
 *     if (err) {
 *         console.log(err);
 *     } else {
 *         console.log(result);
 *         // 6000
 *         // which is the sum of the file sizes of the three files
 *     }
 * });
 *
 * // Error Handling
 * async.reduce(withMissingFileList, 0, getFileSizeInBytes, function(err, result) {
 *     if (err) {
 *         console.log(err);
 *         // [ Error: ENOENT: no such file or directory ]
 *     } else {
 *         console.log(result);
 *     }
 * });
 *
 * // Using Promises
 * async.reduce(fileList, 0, getFileSizeInBytes)
 * .then( result => {
 *     console.log(result);
 *     // 6000
 *     // which is the sum of the file sizes of the three files
 * }).catch( err => {
 *     console.log(err);
 * });
 *
 * // Error Handling
 * async.reduce(withMissingFileList, 0, getFileSizeInBytes)
 * .then( result => {
 *     console.log(result);
 * }).catch( err => {
 *     console.log(err);
 *     // [ Error: ENOENT: no such file or directory ]
 * });
 *
 * // Using async/await
 * async () => {
 *     try {
 *         let result = await async.reduce(fileList, 0, getFileSizeInBytes);
 *         console.log(result);
 *         // 6000
 *         // which is the sum of the file sizes of the three files
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 * // Error Handling
 * async () => {
 *     try {
 *         let result = await async.reduce(withMissingFileList, 0, getFileSizeInBytes);
 *         console.log(result);
 *     }
 *     catch (err) {
 *         console.log(err);
 *         // [ Error: ENOENT: no such file or directory ]
 *     }
 * }
 *
 */
function reduce(coll, memo, iteratee, callback) {
    callback = (0, _once2.default)(callback);
    var _iteratee = (0, _wrapAsync2.default)(iteratee);
    return (0, _eachOfSeries2.default)(coll, (x, i, iterCb) => {
        _iteratee(memo, x, (err, v) => {
            memo = v;
            iterCb(err);
        });
    }, err => callback(err, memo));
}
exports.default = (0, _awaitify2.default)(reduce, 4);
module.exports = exports.default;