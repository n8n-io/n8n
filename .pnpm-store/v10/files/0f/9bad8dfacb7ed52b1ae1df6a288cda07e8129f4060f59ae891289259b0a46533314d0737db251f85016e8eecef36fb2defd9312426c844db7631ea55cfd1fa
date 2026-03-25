/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {assert} = require('./assert');

/**
 * @class PromiseAdapter
 * @summary Adapter for the primary promise operations.
 * @description
 * Provides compatibility with promise libraries that cannot be recognized automatically,
 * via functions that implement the primary operations with promises:
 *
 *  - construct a new promise with a callback function
 *  - resolve a promise with some result data
 *  - reject a promise with a reason
 *  - resolve an array of promises
 *
 * The type is available from the library's root: `pgp.PromiseAdapter`.
 *
 * @param {object} api
 * Promise API configuration object.
 *
 * Passing in anything other than an object will throw {@link external:TypeError TypeError} = `Adapter requires an api configuration object.`
 *
 * @param {function} api.create
 * A function that takes a callback parameter and returns a new promise object.
 * The callback parameter is expected to be `function(resolve, reject)`.
 *
 * Passing in anything other than a function will throw {@link external:TypeError TypeError} = `Function 'create' must be specified.`
 *
 * @param {function} api.resolve
 * A function that takes an optional data parameter and resolves a promise with it.
 *
 * Passing in anything other than a function will throw {@link external:TypeError TypeError} = `Function 'resolve' must be specified.`
 *
 * @param {function} api.reject
 * A function that takes an optional error parameter and rejects a promise with it.
 *
 * Passing in anything other than a function will throw {@link external:TypeError TypeError} = `Function 'reject' must be specified.`
 *
 * @param {function} api.all
 * A function that resolves an array of promises.
 *
 * Passing in anything other than a function will throw {@link external:TypeError TypeError} = `Function 'all' must be specified.`
 *
 * @returns {PromiseAdapter}
 */
class PromiseAdapter {
    constructor(api) {

        if (!api || typeof api !== 'object') {
            throw new TypeError('Adapter requires an api configuration object.');
        }

        api = assert(api, ['create', 'resolve', 'reject', 'all']);

        this.create = api.create;
        this.resolve = api.resolve;
        this.reject = api.reject;
        this.all = api.all;

        if (typeof this.create !== 'function') {
            throw new TypeError('Function \'create\' must be specified.');
        }

        if (typeof this.resolve !== 'function') {
            throw new TypeError('Function \'resolve\' must be specified.');
        }

        if (typeof this.reject !== 'function') {
            throw new TypeError('Function \'reject\' must be specified.');
        }

        if (typeof this.all !== 'function') {
            throw new TypeError('Function \'all\' must be specified.');
        }
    }
}

module.exports = {PromiseAdapter};
