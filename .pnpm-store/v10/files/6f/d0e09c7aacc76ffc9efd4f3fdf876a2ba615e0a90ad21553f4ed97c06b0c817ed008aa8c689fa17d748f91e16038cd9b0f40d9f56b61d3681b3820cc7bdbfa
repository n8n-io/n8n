"use strict";
/* eslint-disable prefer-rest-params */
Object.defineProperty(exports, "__esModule", { value: true });
exports.callbackifyAll = exports.callbackify = exports.promisifyAll = exports.promisify = void 0;
/**
 * Wraps a callback style function to conditionally return a promise.
 *
 * @param {function} originalMethod - The method to promisify.
 * @param {object=} options - Promise options.
 * @param {boolean} options.singular - Resolve the promise with single arg instead of an array.
 * @return {function} wrapped
 */
function promisify(originalMethod, options) {
    if (originalMethod.promisified_) {
        return originalMethod;
    }
    options = options || {};
    const slice = Array.prototype.slice;
    // tslint:disable-next-line:no-any
    const wrapper = function () {
        let last;
        for (last = arguments.length - 1; last >= 0; last--) {
            const arg = arguments[last];
            if (typeof arg === 'undefined') {
                continue; // skip trailing undefined.
            }
            if (typeof arg !== 'function') {
                break; // non-callback last argument found.
            }
            return originalMethod.apply(this, arguments);
        }
        // peel trailing undefined.
        const args = slice.call(arguments, 0, last + 1);
        // tslint:disable-next-line:variable-name
        let PromiseCtor = Promise;
        // Because dedupe will likely create a single install of
        // @google-cloud/common to be shared amongst all modules, we need to
        // localize it at the Service level.
        if (this && this.Promise) {
            PromiseCtor = this.Promise;
        }
        return new PromiseCtor((resolve, reject) => {
            // tslint:disable-next-line:no-any
            args.push((...args) => {
                const callbackArgs = slice.call(args);
                const err = callbackArgs.shift();
                if (err) {
                    return reject(err);
                }
                if (options.singular && callbackArgs.length === 1) {
                    resolve(callbackArgs[0]);
                }
                else {
                    resolve(callbackArgs);
                }
            });
            originalMethod.apply(this, args);
        });
    };
    wrapper.promisified_ = true;
    return wrapper;
}
exports.promisify = promisify;
/**
 * Promisifies certain Class methods. This will not promisify private or
 * streaming methods.
 *
 * @param {module:common/service} Class - Service class.
 * @param {object=} options - Configuration object.
 */
// tslint:disable-next-line:variable-name
function promisifyAll(Class, options) {
    const exclude = (options && options.exclude) || [];
    const ownPropertyNames = Object.getOwnPropertyNames(Class.prototype);
    const methods = ownPropertyNames.filter(methodName => {
        // clang-format off
        return (!exclude.includes(methodName) &&
            typeof Class.prototype[methodName] === 'function' && // is it a function?
            !/(^_|(Stream|_)|promise$)|^constructor$/.test(methodName) // is it promisable?
        );
        // clang-format on
    });
    methods.forEach(methodName => {
        const originalMethod = Class.prototype[methodName];
        if (!originalMethod.promisified_) {
            Class.prototype[methodName] = exports.promisify(originalMethod, options);
        }
    });
}
exports.promisifyAll = promisifyAll;
/**
 * Wraps a promisy type function to conditionally call a callback function.
 *
 * @param {function} originalMethod - The method to callbackify.
 * @param {object=} options - Callback options.
 * @param {boolean} options.singular - Pass to the callback a single arg instead of an array.
 * @return {function} wrapped
 */
function callbackify(originalMethod) {
    if (originalMethod.callbackified_) {
        return originalMethod;
    }
    // tslint:disable-next-line:no-any
    const wrapper = function () {
        if (typeof arguments[arguments.length - 1] !== 'function') {
            return originalMethod.apply(this, arguments);
        }
        const cb = Array.prototype.pop.call(arguments);
        originalMethod.apply(this, arguments).then(
        // tslint:disable-next-line:no-any
        (res) => {
            res = Array.isArray(res) ? res : [res];
            cb(null, ...res);
        }, (err) => cb(err));
    };
    wrapper.callbackified_ = true;
    return wrapper;
}
exports.callbackify = callbackify;
/**
 * Callbackifies certain Class methods. This will not callbackify private or
 * streaming methods.
 *
 * @param {module:common/service} Class - Service class.
 * @param {object=} options - Configuration object.
 */
function callbackifyAll(
// tslint:disable-next-line:variable-name
Class, options) {
    const exclude = (options && options.exclude) || [];
    const ownPropertyNames = Object.getOwnPropertyNames(Class.prototype);
    const methods = ownPropertyNames.filter(methodName => {
        // clang-format off
        return (!exclude.includes(methodName) &&
            typeof Class.prototype[methodName] === 'function' && // is it a function?
            !/^_|(Stream|_)|^constructor$/.test(methodName) // is it callbackifyable?
        );
        // clang-format on
    });
    methods.forEach(methodName => {
        const originalMethod = Class.prototype[methodName];
        if (!originalMethod.callbackified_) {
            Class.prototype[methodName] = exports.callbackify(originalMethod);
        }
    });
}
exports.callbackifyAll = callbackifyAll;
//# sourceMappingURL=index.js.map