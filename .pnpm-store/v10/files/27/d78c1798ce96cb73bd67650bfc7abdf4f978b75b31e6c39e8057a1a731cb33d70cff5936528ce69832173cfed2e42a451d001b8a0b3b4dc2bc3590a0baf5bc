'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = reflect;

var _initialParams = require('./internal/initialParams.js');

var _initialParams2 = _interopRequireDefault(_initialParams);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Wraps the async function in another function that always completes with a
 * result object, even when it errors.
 *
 * The result object has either the property `error` or `value`.
 *
 * @name reflect
 * @static
 * @memberOf module:Utils
 * @method
 * @category Util
 * @param {AsyncFunction} fn - The async function you want to wrap
 * @returns {Function} - A function that always passes null to it's callback as
 * the error. The second argument to the callback will be an `object` with
 * either an `error` or a `value` property.
 * @example
 *
 * async.parallel([
 *     async.reflect(function(callback) {
 *         // do some stuff ...
 *         callback(null, 'one');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff but error ...
 *         callback('bad stuff happened');
 *     }),
 *     async.reflect(function(callback) {
 *         // do some more stuff ...
 *         callback(null, 'two');
 *     })
 * ],
 * // optional callback
 * function(err, results) {
 *     // values
 *     // results[0].value = 'one'
 *     // results[1].error = 'bad stuff happened'
 *     // results[2].value = 'two'
 * });
 */
function reflect(fn) {
    var _fn = (0, _wrapAsync2.default)(fn);
    return (0, _initialParams2.default)(function reflectOn(args, reflectCallback) {
        args.push((error, ...cbArgs) => {
            let retVal = {};
            if (error) {
                retVal.error = error;
            }
            if (cbArgs.length > 0) {
                var value = cbArgs;
                if (cbArgs.length <= 1) {
                    [value] = cbArgs;
                }
                retVal.value = value;
            }
            reflectCallback(null, retVal);
        });

        return _fn.apply(this, args);
    });
}
module.exports = exports.default;