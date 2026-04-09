'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _onlyOnce = require('./internal/onlyOnce.js');

var _onlyOnce2 = _interopRequireDefault(_onlyOnce);

var _ensureAsync = require('./ensureAsync.js');

var _ensureAsync2 = _interopRequireDefault(_ensureAsync);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _awaitify = require('./internal/awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Calls the asynchronous function `fn` with a callback parameter that allows it
 * to call itself again, in series, indefinitely.

 * If an error is passed to the callback then `errback` is called with the
 * error, and execution stops, otherwise it will never be called.
 *
 * @name forever
 * @static
 * @memberOf module:ControlFlow
 * @method
 * @category Control Flow
 * @param {AsyncFunction} fn - an async function to call repeatedly.
 * Invoked with (next).
 * @param {Function} [errback] - when `fn` passes an error to it's callback,
 * this function will be called, and execution stops. Invoked with (err).
 * @returns {Promise} a promise that rejects if an error occurs and an errback
 * is not passed
 * @example
 *
 * async.forever(
 *     function(next) {
 *         // next is suitable for passing to things that need a callback(err [, whatever]);
 *         // it will result in this function being called again.
 *     },
 *     function(err) {
 *         // if next is called with a value in its first parameter, it will appear
 *         // in here as 'err', and execution will stop.
 *     }
 * );
 */
function forever(fn, errback) {
    var done = (0, _onlyOnce2.default)(errback);
    var task = (0, _wrapAsync2.default)((0, _ensureAsync2.default)(fn));

    function next(err) {
        if (err) return done(err);
        if (err === false) return;
        task(next);
    }
    return next();
}
exports.default = (0, _awaitify2.default)(forever, 2);
module.exports = exports.default;