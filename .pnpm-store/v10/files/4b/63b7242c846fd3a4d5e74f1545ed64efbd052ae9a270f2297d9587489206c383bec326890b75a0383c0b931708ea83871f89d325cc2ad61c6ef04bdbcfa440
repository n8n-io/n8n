/**
 * @class PromiseAdapter
 * @description
 * Adapter for the primary promise operations.
 *
 * Provides compatibility with promise libraries that cannot be recognized automatically,
 * via functions that implement the primary operations with promises:
 *
 *  - construct a new promise with a callback function
 *  - resolve a promise with some result data
 *  - reject a promise with a reason
 *
 * #### Example
 *
 * Below is an example of setting up a [client-side]{@tutorial client} adapter for AngularJS $q.
 *
 * ```js
 * const spexLib = require('spex'); // or include client-side spex.js
 *
 * const adapter = new spexLib.PromiseAdapter(
 *    cb => $q(cb), // creating a new promise;
 *    data => $q.when(data), // resolving a promise;
 *    reason => $q.reject(reason) // rejecting a promise;
 *    );
 *
 * const spex = spexLib(adapter);
 * ```
 *
 * @param {Function} create
 * A function that takes a callback parameter and returns a new promise object.
 * The callback parameter is expected to be `function(resolve, reject)`.
 *
 * Passing in anything other than a function will throw `Adapter requires a function to create a promise.`
 *
 * @param {Function} resolve
 * A function that takes an optional data parameter and resolves a promise with it.
 *
 * Passing in anything other than a function will throw `Adapter requires a function to resolve a promise.`
 *
 * @param {Function} reject
 * A function that takes an optional error parameter and rejects a promise with it.
 *
 * Passing in anything other than a function will throw `Adapter requires a function to reject a promise.`
 *
 * @see {@tutorial client}
 *
 */
class PromiseAdapter {
    constructor(create, resolve, reject) {
        this.create = create;
        this.resolve = resolve;
        this.reject = reject;

        if (typeof create !== 'function') {
            throw new TypeError('Adapter requires a function to create a promise.');
        }

        if (typeof resolve !== 'function') {
            throw new TypeError('Adapter requires a function to resolve a promise.');
        }

        if (typeof reject !== 'function') {
            throw new TypeError('Adapter requires a function to reject a promise.');
        }
    }
}

module.exports = PromiseAdapter;
