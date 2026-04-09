'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = retryable;

var _retry = require('./retry.js');

var _retry2 = _interopRequireDefault(_retry);

var _initialParams = require('./internal/initialParams.js');

var _initialParams2 = _interopRequireDefault(_initialParams);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _promiseCallback = require('./internal/promiseCallback.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
 * wraps a task and makes it retryable, rather than immediately calling it
 * with retries.
 *
 * @name retryable
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @see [async.retry]{@link module:ControlFlow.retry}
 * @category Control Flow
 * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
 * options, exactly the same as from `retry`, except for a `opts.arity` that
 * is the arity of the `task` function, defaulting to `task.length`
 * @param {AsyncFunction} task - the asynchronous function to wrap.
 * This function will be passed any arguments passed to the returned wrapper.
 * Invoked with (...args, callback).
 * @returns {AsyncFunction} The wrapped function, which when invoked, will
 * retry on an error, based on the parameters specified in `opts`.
 * This function will accept the same parameters as `task`.
 * @example
 *
 * async.auto({
 *     dep1: async.retryable(3, getFromFlakyService),
 *     process: ["dep1", async.retryable(3, function (results, cb) {
 *         maybeProcessData(results.dep1, cb);
 *     })]
 * }, callback);
 */
function retryable(opts, task) {
    if (!task) {
        task = opts;
        opts = null;
    }
    let arity = opts && opts.arity || task.length;
    if ((0, _wrapAsync.isAsync)(task)) {
        arity += 1;
    }
    var _task = (0, _wrapAsync2.default)(task);
    return (0, _initialParams2.default)((args, callback) => {
        if (args.length < arity - 1 || callback == null) {
            args.push(callback);
            callback = (0, _promiseCallback.promiseCallback)();
        }
        function taskFn(cb) {
            _task(...args, cb);
        }

        if (opts) (0, _retry2.default)(opts, taskFn, callback);else (0, _retry2.default)(taskFn, callback);

        return callback[_promiseCallback.PROMISE_SYMBOL];
    });
}
module.exports = exports.default;