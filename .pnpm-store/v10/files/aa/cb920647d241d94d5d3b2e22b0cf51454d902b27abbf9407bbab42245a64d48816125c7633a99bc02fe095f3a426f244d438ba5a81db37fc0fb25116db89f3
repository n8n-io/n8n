'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createTester = require('./internal/createTester.js');

var _createTester2 = _interopRequireDefault(_createTester);

var _eachOf = require('./eachOf.js');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Returns the first value in `coll` that passes an async truth test. The
 * `iteratee` is applied in parallel, meaning the first iteratee to return
 * `true` will fire the detect `callback` with that result. That means the
 * result might not be the first item in the original `coll` (in terms of order)
 * that passes the test.

 * If order within the original `coll` is important, then look at
 * [`detectSeries`]{@link module:Collections.detectSeries}.
 *
 * @name detect
 * @static
 * @memberOf module:Collections
 * @method
 * @alias find
 * @category Collections
 * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
 * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
 * The iteratee must complete with a boolean value as its result.
 * Invoked with (item, callback).
 * @param {Function} [callback] - A callback which is called as soon as any
 * iteratee returns `true`, or after all the `iteratee` functions have finished.
 * Result will be the first item in the array that passes the truth test
 * (iteratee) or the value `undefined` if none passed. Invoked with
 * (err, result).
 * @returns {Promise} a promise, if a callback is omitted
 * @example
 *
 * // dir1 is a directory that contains file1.txt, file2.txt
 * // dir2 is a directory that contains file3.txt, file4.txt
 * // dir3 is a directory that contains file5.txt
 *
 * // asynchronous function that checks if a file exists
 * function fileExists(file, callback) {
 *    fs.access(file, fs.constants.F_OK, (err) => {
 *        callback(null, !err);
 *    });
 * }
 *
 * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists,
 *    function(err, result) {
 *        console.log(result);
 *        // dir1/file1.txt
 *        // result now equals the first file in the list that exists
 *    }
 *);
 *
 * // Using Promises
 * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists)
 * .then(result => {
 *     console.log(result);
 *     // dir1/file1.txt
 *     // result now equals the first file in the list that exists
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * // Using async/await
 * async () => {
 *     try {
 *         let result = await async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists);
 *         console.log(result);
 *         // dir1/file1.txt
 *         // result now equals the file in the list that exists
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 */
function detect(coll, iteratee, callback) {
  return (0, _createTester2.default)(bool => bool, (res, item) => item)(_eachOf2.default, coll, iteratee, callback);
}
exports.default = (0, _awaitify2.default)(detect, 3);
module.exports = exports['default'];