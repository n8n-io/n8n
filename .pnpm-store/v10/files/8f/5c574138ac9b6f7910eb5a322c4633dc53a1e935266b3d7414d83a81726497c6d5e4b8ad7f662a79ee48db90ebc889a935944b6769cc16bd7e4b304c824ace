'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _reject2 = require('./internal/reject.js');

var _reject3 = _interopRequireDefault(_reject2);

var _eachOf = require('./eachOf.js');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
 *
 * @name reject
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.filter]{@link module:Collections.filter}
 * @category Collection
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - An async truth test to apply to each item in
 * `coll`.
 * The should complete with a boolean value as its `result`.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called after all the
 * `iteratee` functions have finished. Invoked with (err, results).
 * @returns {Promise} a promise, if no callback is passed
 * @example
 *
 * // dir1 is a directory that contains file1.txt, file2.txt
 * // dir2 is a directory that contains file3.txt, file4.txt
 * // dir3 is a directory that contains file5.txt
 *
 * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
 *
 * // asynchronous function that checks if a file exists
 * function fileExists(file, callback) {
 *    fs.access(file, fs.constants.F_OK, (err) => {
 *        callback(null, !err);
 *    });
 * }
 *
 * // Using callbacks
 * async.reject(fileList, fileExists, function(err, results) {
 *    // [ 'dir3/file6.txt' ]
 *    // results now equals an array of the non-existing files
 * });
 *
 * // Using Promises
 * async.reject(fileList, fileExists)
 * .then( results => {
 *     console.log(results);
 *     // [ 'dir3/file6.txt' ]
 *     // results now equals an array of the non-existing files
 * }).catch( err => {
 *     console.log(err);
 * });
 *
 * // Using async/await
 * async () => {
 *     try {
 *         let results = await async.reject(fileList, fileExists);
 *         console.log(results);
 *         // [ 'dir3/file6.txt' ]
 *         // results now equals an array of the non-existing files
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 */
function reject(coll, iteratee, callback) {
    return (0, _reject3.default)(_eachOf2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(reject, 3);
module.exports = exports.default;