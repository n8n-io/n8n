'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = transform;

var _eachOf = require('./eachOf.js');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _once = require('./internal/once.js');

var _once2 = _interopRequireDefault(_once);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _promiseCallback = require('./internal/promiseCallback.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A relative of `reduce`.  Takes an Object or Array, and iterates over each
 * element in parallel, each step potentially mutating an `accumulator` value.
 * The type of the accumulator defaults to the type of collection passed in.
 *
 * @name transform
 * @static
 * @memberOf module:Collections
 * @method
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {*} [accumulator] - The initial state of the transform.  If omitted,
 * it will default to an empty Object or Array, depending on the type of `coll`
 * @param {AsyncFunction} iteratee - A function applied to each item in the
 * collection that potentially modifies the accumulator.
 * Invoked with (accumulator, item, key, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Result is the transformed accumulator.
 * Invoked with (err, result).
 * @returns {Promise} a promise, if no callback provided
 * @example
 *
 * // file1.txt is a file that is 1000 bytes in size
 * // file2.txt is a file that is 2000 bytes in size
 * // file3.txt is a file that is 3000 bytes in size
 *
 * // helper function that returns human-readable size format from bytes
 * function formatBytes(bytes, decimals = 2) {
 *   // implementation not included for brevity
 *   return humanReadbleFilesize;
 * }
 *
 * const fileList = ['file1.txt','file2.txt','file3.txt'];
 *
 * // asynchronous function that returns the file size, transformed to human-readable format
 * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
 * function transformFileSize(acc, value, key, callback) {
 *     fs.stat(value, function(err, stat) {
 *         if (err) {
 *             return callback(err);
 *         }
 *         acc[key] = formatBytes(stat.size);
 *         callback(null);
 *     });
 * }
 *
 * // Using callbacks
 * async.transform(fileList, transformFileSize, function(err, result) {
 *     if(err) {
 *         console.log(err);
 *     } else {
 *         console.log(result);
 *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
 *     }
 * });
 *
 * // Using Promises
 * async.transform(fileList, transformFileSize)
 * .then(result => {
 *     console.log(result);
 *     // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * // Using async/await
 * (async () => {
 *     try {
 *         let result = await async.transform(fileList, transformFileSize);
 *         console.log(result);
 *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * })();
 *
 * @example
 *
 * // file1.txt is a file that is 1000 bytes in size
 * // file2.txt is a file that is 2000 bytes in size
 * // file3.txt is a file that is 3000 bytes in size
 *
 * // helper function that returns human-readable size format from bytes
 * function formatBytes(bytes, decimals = 2) {
 *   // implementation not included for brevity
 *   return humanReadbleFilesize;
 * }
 *
 * const fileMap = { f1: 'file1.txt', f2: 'file2.txt', f3: 'file3.txt' };
 *
 * // asynchronous function that returns the file size, transformed to human-readable format
 * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
 * function transformFileSize(acc, value, key, callback) {
 *     fs.stat(value, function(err, stat) {
 *         if (err) {
 *             return callback(err);
 *         }
 *         acc[key] = formatBytes(stat.size);
 *         callback(null);
 *     });
 * }
 *
 * // Using callbacks
 * async.transform(fileMap, transformFileSize, function(err, result) {
 *     if(err) {
 *         console.log(err);
 *     } else {
 *         console.log(result);
 *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
 *     }
 * });
 *
 * // Using Promises
 * async.transform(fileMap, transformFileSize)
 * .then(result => {
 *     console.log(result);
 *     // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * // Using async/await
 * async () => {
 *     try {
 *         let result = await async.transform(fileMap, transformFileSize);
 *         console.log(result);
 *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 */
function transform(coll, accumulator, iteratee, callback) {
    if (arguments.length <= 3 && typeof accumulator === 'function') {
        callback = iteratee;
        iteratee = accumulator;
        accumulator = Array.isArray(coll) ? [] : {};
    }
    callback = (0, _once2.default)(callback || (0, _promiseCallback.promiseCallback)());
    var _iteratee = (0, _wrapAsync2.default)(iteratee);

    (0, _eachOf2.default)(coll, (v, k, cb) => {
        _iteratee(accumulator, v, k, cb);
    }, err => callback(err, accumulator));
    return callback[_promiseCallback.PROMISE_SYMBOL];
}
module.exports = exports.default;