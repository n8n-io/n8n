const npm = {
    utils: require('./utils'),
    batch: require('./ext/batch'),
    page: require('./ext/page'),
    sequence: require('./ext/sequence'),
    stream: require('./ext/stream'),
    errors: require('./errors')
};

/**
 * @module spex
 * @summary Specialized Promise Extensions
 * @author Vitaly Tomilov
 *
 * @description
 * Attaches to an external promise library and provides additional methods built solely
 * on the basic promise operations:
 *  - construct a new promise with a callback function
 *  - resolve a promise with some result data
 *  - reject a promise with a reason
 *
 * ### usage
 * For any third-party promise library:
 * ```js
 * const promise = require('bluebird');
 * const spex = require('spex')(promise);
 * ```
 * For ES6 promises:
 * ```js
 * const spex = require('spex')(Promise);
 * ```
 *
 * @param {Object|Function} promiseLib
 * Instance of a promise library to be used by this module.
 *
 * Some implementations use `Promise` constructor to create a new promise, while
 * others use the module's function for it. Both types are supported the same.
 *
 * Alternatively, an object of type {@link PromiseAdapter} can be passed in, which provides
 * compatibility with any promise library outside of the standard.
 *
 * Passing in a promise library that cannot be recognized will throw
 * `Invalid promise library specified.`
 *
 * @returns {Object}
 * Namespace with all supported methods.
 *
 * @see {@link PromiseAdapter}, {@link batch}, {@link page}, {@link sequence}, {@link stream}
 */
function main(promiseLib) {

    const spex = {}, // library instance;
        promise = parsePromiseLib(promiseLib); // promise library parsing;

    const config = {
        spex: spex,
        promise: promise,
        utils: npm.utils(promise)
    };

    spex.errors = npm.errors;
    spex.batch = npm.batch(config);
    spex.page = npm.page(config);
    spex.sequence = npm.sequence(config);
    spex.stream = npm.stream(config);

    config.utils.extend(spex, '$p', promise);

    Object.freeze(spex);

    return spex;
}

//////////////////////////////////////////
// Parses and validates a promise library;
function parsePromiseLib(lib) {
    if (lib) {
        let promise;
        if (lib instanceof main.PromiseAdapter) {
            promise = function (func) {
                return lib.create(func);
            };
            promise.resolve = lib.resolve;
            promise.reject = lib.reject;
            return promise;
        }
        const t = typeof lib;
        if (t === 'function' || t === 'object') {
            const Root = typeof lib.Promise === 'function' ? lib.Promise : lib;
            promise = function (func) {
                return new Root(func);
            };
            promise.resolve = Root.resolve;
            promise.reject = Root.reject;
            if (typeof promise.resolve === 'function' && typeof promise.reject === 'function') {
                return promise;
            }
        }
    }
    throw new TypeError('Invalid promise library specified.');
}

main.PromiseAdapter = require('./adapter');
main.errors = npm.errors;

Object.freeze(main);

module.exports = main;

/**
 * @external Error
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
 */

/**
 * @external TypeError
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
 */

/**
 * @external Promise
 * @see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
 */
