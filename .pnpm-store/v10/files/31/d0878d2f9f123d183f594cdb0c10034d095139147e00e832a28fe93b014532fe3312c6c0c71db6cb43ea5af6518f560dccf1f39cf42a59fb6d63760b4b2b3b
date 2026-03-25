'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _filter2 = require('./internal/filter.js');

var _filter3 = _interopRequireDefault(_filter2);

var _eachOf = require('./eachOf.js');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Returns a new array of all the values in `coll` which pass an async truth
 * test. This operation is performed in parallel, but the results array will be
 * in the same order as the original.
 *
 * @name filter
 * @static
 * @memberOf module:Collections
 * @method
 * @alias select
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A truth test to apply to each item in `coll`.
 * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
 * with a boolean argument once it has completed. Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @returns {Promise} a promise, if no callback provided
 * @example
 *
 * // dir1 is a directory that contains file1.txt, file2.txt
 * // dir2 is a directory that contains file3.txt, file4.txt
 * // dir3 is a directory that contains file5.txt
 *
 * const files = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
 *
 * // asynchronous function that checks if a file exists
 * function fileExists(file, callback) {
 *    fs.access(file, fs.constants.F_OK, (err) => {
 *        callback(null, !err);
 *    });
 * }
 *
 * // Using callbacks
 * async.filter(files, fileExists, function(err, results) {
 *    if(err) {
 *        console.log(err);
 *    } else {
 *        console.log(results);
 *        // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
 *        // results is now an array of the existing files
 *    }
 * });
 *
 * // Using Promises
 * async.filter(files, fileExists)
 * .then(results => {
 *     console.log(results);
 *     // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
 *     // results is now an array of the existing files
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * // Using async/await
 * async () => {
 *     try {
 *         let results = await async.filter(files, fileExists);
 *         console.log(results);
 *         // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
 *         // results is now an array of the existing files
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 */
function filter(coll, iteratee, callback) {
  return (0, _filter3.default)(_eachOf2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(filter, 3);
module.exports = exports['default'];