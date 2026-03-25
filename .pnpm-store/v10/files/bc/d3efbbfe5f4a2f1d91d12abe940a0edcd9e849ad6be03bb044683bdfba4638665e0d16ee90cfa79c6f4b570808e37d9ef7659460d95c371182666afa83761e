"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncQueue = exports.Async = void 0;
function toWeightedIterator(iterable, useWeights) {
    const iterator = (iterable[Symbol.iterator] ||
        iterable[Symbol.asyncIterator]).call(iterable);
    return {
        [Symbol.asyncIterator]: () => ({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            next: async () => {
                // The await is necessary here, but TS will complain - it's a false positive.
                const { value, done } = await iterator.next();
                return {
                    value: { element: value, weight: useWeights ? value === null || value === void 0 ? void 0 : value.weight : 1 },
                    done: !!done
                };
            }
        })
    };
}
/**
 * Utilities for parallel asynchronous operations, for use with the system `Promise` APIs.
 *
 * @public
 */
class Async {
    static async mapAsync(iterable, callback, options) {
        const result = [];
        // @ts-expect-error https://github.com/microsoft/TypeScript/issues/22609, it succeeds against the implementation but fails against the overloads
        await Async.forEachAsync(iterable, async (item, arrayIndex) => {
            result[arrayIndex] = await callback(item, arrayIndex);
        }, options);
        return result;
    }
    static async _forEachWeightedAsync(iterable, callback, options) {
        await new Promise((resolve, reject) => {
            const concurrency = (options === null || options === void 0 ? void 0 : options.concurrency) && options.concurrency > 0 ? options.concurrency : Infinity;
            let concurrentUnitsInProgress = 0;
            const iterator = iterable[Symbol.asyncIterator].call(iterable);
            let arrayIndex = 0;
            let iteratorIsComplete = false;
            let promiseHasResolvedOrRejected = false;
            async function queueOperationsAsync() {
                while (concurrentUnitsInProgress < concurrency &&
                    !iteratorIsComplete &&
                    !promiseHasResolvedOrRejected) {
                    // Increment the current concurrency units in progress by the concurrency limit before fetching the iterator weight.
                    // This function is reentrant, so this if concurrency is finite, at most 1 operation will be waiting. If it's infinite,
                    //  there will be effectively no cap on the number of operations waiting.
                    const limitedConcurrency = !Number.isFinite(concurrency) ? 1 : concurrency;
                    concurrentUnitsInProgress += limitedConcurrency;
                    const currentIteratorResult = await iterator.next();
                    // eslint-disable-next-line require-atomic-updates
                    iteratorIsComplete = !!currentIteratorResult.done;
                    if (!iteratorIsComplete) {
                        const currentIteratorValue = currentIteratorResult.value;
                        Async.validateWeightedIterable(currentIteratorValue);
                        // Cap the weight to concurrency, this allows 0 weight items to execute despite the concurrency limit.
                        const weight = Math.min(currentIteratorValue.weight, concurrency);
                        // Remove the "lock" from the concurrency check and only apply the current weight.
                        //  This should allow other operations to execute.
                        concurrentUnitsInProgress += weight;
                        concurrentUnitsInProgress -= limitedConcurrency;
                        Promise.resolve(callback(currentIteratorValue.element, arrayIndex++))
                            .then(async () => {
                            // Remove the operation completely from the in progress units.
                            concurrentUnitsInProgress -= weight;
                            await onOperationCompletionAsync();
                        })
                            .catch((error) => {
                            promiseHasResolvedOrRejected = true;
                            reject(error);
                        });
                    }
                    else {
                        // The iterator is complete and there wasn't a value, so untrack the waiting state.
                        concurrentUnitsInProgress -= limitedConcurrency;
                    }
                }
                if (iteratorIsComplete) {
                    await onOperationCompletionAsync();
                }
            }
            async function onOperationCompletionAsync() {
                if (!promiseHasResolvedOrRejected) {
                    if (concurrentUnitsInProgress === 0 && iteratorIsComplete) {
                        promiseHasResolvedOrRejected = true;
                        resolve();
                    }
                    else if (!iteratorIsComplete) {
                        await queueOperationsAsync();
                    }
                }
            }
            queueOperationsAsync().catch((error) => {
                promiseHasResolvedOrRejected = true;
                reject(error);
            });
        });
    }
    static async forEachAsync(iterable, callback, options) {
        await Async._forEachWeightedAsync(toWeightedIterator(iterable, options === null || options === void 0 ? void 0 : options.weighted), callback, options);
    }
    /**
     * Return a promise that resolves after the specified number of milliseconds.
     */
    static async sleepAsync(ms) {
        await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    /**
     * Executes an async function and optionally retries it if it fails.
     */
    static async runWithRetriesAsync({ action, maxRetries, retryDelayMs = 0 }) {
        let retryCount = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                return await action(retryCount);
            }
            catch (e) {
                if (++retryCount > maxRetries) {
                    throw e;
                }
                else if (retryDelayMs > 0) {
                    await Async.sleepAsync(retryDelayMs);
                }
            }
        }
    }
    /**
     * Ensures that the argument is a valid {@link IWeighted}, with a `weight` argument that
     * is a positive integer or 0.
     */
    static validateWeightedIterable(operation) {
        if (operation.weight < 0) {
            throw new Error('Weight must be a whole number greater than or equal to 0');
        }
        if (operation.weight % 1 !== 0) {
            throw new Error('Weight must be a whole number greater than or equal to 0');
        }
    }
    /**
     * Returns a Signal, a.k.a. a "deferred promise".
     */
    static getSignal() {
        return getSignal();
    }
}
exports.Async = Async;
/**
 * Returns an unwrapped promise.
 */
function getSignal() {
    let resolver;
    let rejecter;
    const promise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
    });
    return [promise, resolver, rejecter];
}
/**
 * A queue that allows for asynchronous iteration. During iteration, the queue will wait until
 * the next item is pushed into the queue before yielding. If instead all queue items are consumed
 * and all callbacks have been called, the queue will return.
 *
 * @public
 */
class AsyncQueue {
    constructor(iterable) {
        this._queue = iterable ? Array.from(iterable) : [];
        const [promise, resolver] = getSignal();
        this._onPushSignal = promise;
        this._onPushResolve = resolver;
    }
    [Symbol.asyncIterator]() {
        return __asyncGenerator(this, arguments, function* _a() {
            let activeIterations = 0;
            let [callbackSignal, callbackResolve] = getSignal();
            const callback = () => {
                if (--activeIterations === 0) {
                    // Resolve whatever the latest callback promise is and create a new one
                    callbackResolve();
                    const [newCallbackSignal, newCallbackResolve] = getSignal();
                    callbackSignal = newCallbackSignal;
                    callbackResolve = newCallbackResolve;
                }
            };
            let position = 0;
            while (this._queue.length > position || activeIterations > 0) {
                if (this._queue.length > position) {
                    activeIterations++;
                    yield yield __await([this._queue[position++], callback]);
                }
                else {
                    // On push, the item will be added to the queue and the onPushSignal will be resolved.
                    // On calling the callback, active iterations will be decremented by the callback and the
                    // callbackSignal will be resolved. This means that the loop will continue if there are
                    // active iterations or if there are items in the queue that haven't been yielded yet.
                    yield __await(Promise.race([this._onPushSignal, callbackSignal]));
                }
            }
        });
    }
    /**
     * Adds an item to the queue.
     *
     * @param item - The item to push into the queue.
     */
    push(item) {
        this._queue.push(item);
        this._onPushResolve();
        const [onPushSignal, onPushResolve] = getSignal();
        this._onPushSignal = onPushSignal;
        this._onPushResolve = onPushResolve;
    }
}
exports.AsyncQueue = AsyncQueue;
//# sourceMappingURL=Async.js.map