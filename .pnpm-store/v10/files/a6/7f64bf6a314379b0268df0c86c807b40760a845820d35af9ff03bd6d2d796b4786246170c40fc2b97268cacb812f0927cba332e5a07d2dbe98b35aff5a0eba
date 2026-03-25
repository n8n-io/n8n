'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parallel;

var _eachOf = require('./eachOf.js');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _parallel2 = require('./internal/parallel.js');

var _parallel3 = _interopRequireDefault(_parallel2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Run the `tasks` collection of functions in parallel, without waiting until
 * the previous function has completed. If any of the functions pass an error to
 * its callback, the main `callback` is immediately called with the value of the
 * error. Once the `tasks` have completed, the results are passed to the final
 * `callback` as an array.
 *
 * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
 * parallel execution of code.  If your tasks do not use any timers or perform
 * any I/O, they will actually be executed in series.  Any synchronous setup
 * sections for each task will happen one after the other.  JavaScript remains
 * single-threaded.
 *
 * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
 * execution of other tasks when a task fails.
 *
 * It is also possible to use an object instead of an array. Each property will
 * be run as a function and the results will be passed to the final `callback`
 * as an object instead of an array. This can be a more readable way of handling
 * results from {@link async.parallel}.
 *
 * @name parallel
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
 * [async functions]{@link AsyncFunction} to run.
 * Each async function can complete with any number of optional `result` values.
 * @param {Function} [callback] - An optional callback to run once all the
 * functions have completed successfully. This function gets a results array
 * (or object) containing all the result arguments passed to the task callbacks.
 * Invoked with (err, results).
 * @returns {Promise} a promise, if a callback is not passed
 *
 * @example
 *
 * //Using Callbacks
 * async.parallel([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ], function(err, results) {
 *     console.log(results);
 *     // results is equal to ['one','two'] even though
 *     // the second function had a shorter timeout.
 * });
 *
 * // an example using an object instead of an array
 * async.parallel({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }, function(err, results) {
 *     console.log(results);
 *     // results is equal to: { one: 1, two: 2 }
 * });
 *
 * //Using Promises
 * async.parallel([
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'one');
 *         }, 200);
 *     },
 *     function(callback) {
 *         setTimeout(function() {
 *             callback(null, 'two');
 *         }, 100);
 *     }
 * ]).then(results => {
 *     console.log(results);
 *     // results is equal to ['one','two'] even though
 *     // the second function had a shorter timeout.
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * // an example using an object instead of an array
 * async.parallel({
 *     one: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 1);
 *         }, 200);
 *     },
 *     two: function(callback) {
 *         setTimeout(function() {
 *             callback(null, 2);
 *         }, 100);
 *     }
 * }).then(results => {
 *     console.log(results);
 *     // results is equal to: { one: 1, two: 2 }
 * }).catch(err => {
 *     console.log(err);
 * });
 *
 * //Using async/await
 * async () => {
 *     try {
 *         let results = await async.parallel([
 *             function(callback) {
 *                 setTimeout(function() {
 *                     callback(null, 'one');
 *                 }, 200);
 *             },
 *             function(callback) {
 *                 setTimeout(function() {
 *                     callback(null, 'two');
 *                 }, 100);
 *             }
 *         ]);
 *         console.log(results);
 *         // results is equal to ['one','two'] even though
 *         // the second function had a shorter timeout.
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 * // an example using an object instead of an array
 * async () => {
 *     try {
 *         let results = await async.parallel({
 *             one: function(callback) {
 *                 setTimeout(function() {
 *                     callback(null, 1);
 *                 }, 200);
 *             },
 *            two: function(callback) {
 *                 setTimeout(function() {
 *                     callback(null, 2);
 *                 }, 100);
 *            }
 *         });
 *         console.log(results);
 *         // results is equal to: { one: 1, two: 2 }
 *     }
 *     catch (err) {
 *         console.log(err);
 *     }
 * }
 *
 */
function parallel(tasks, callback) {
  return (0, _parallel3.default)(_eachOf2.default, tasks, callback);
}
module.exports = exports['default'];