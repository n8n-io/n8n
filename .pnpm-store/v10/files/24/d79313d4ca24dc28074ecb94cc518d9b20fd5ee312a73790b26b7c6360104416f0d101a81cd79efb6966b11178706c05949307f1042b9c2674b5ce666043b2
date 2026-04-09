"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
            // iterator that is stored when the loop exits early due to not enough concurrency
            let nextIterator = undefined;
            async function queueOperationsAsync() {
                var _a;
                while (concurrentUnitsInProgress < concurrency &&
                    !iteratorIsComplete &&
                    !promiseHasResolvedOrRejected) {
                    // Increment the current concurrency units in progress by the concurrency limit before fetching the iterator weight.
                    // This function is reentrant, so this if concurrency is finite, at most 1 operation will be waiting. If it's infinite,
                    //  there will be effectively no cap on the number of operations waiting.
                    const limitedConcurrency = !Number.isFinite(concurrency) ? 1 : concurrency;
                    concurrentUnitsInProgress += limitedConcurrency;
                    const currentIteratorResult = nextIterator !== null && nextIterator !== void 0 ? nextIterator : (await iterator.next());
                    // eslint-disable-next-line require-atomic-updates
                    iteratorIsComplete = !!currentIteratorResult.done;
                    if (!iteratorIsComplete) {
                        const currentIteratorValue = currentIteratorResult.value;
                        Async.validateWeightedIterable(currentIteratorValue);
                        // Cap the weight to concurrency, this allows 0 weight items to execute despite the concurrency limit.
                        const weight = Math.min(currentIteratorValue.weight, concurrency);
                        // Remove the "lock" from the concurrency check and only apply the current weight.
                        //  This should allow other operations to execute.
                        concurrentUnitsInProgress -= limitedConcurrency;
                        // Wait until there's enough capacity to run this job, this function will be re-entered as tasks call `onOperationCompletionAsync`
                        const wouldExceedConcurrency = concurrentUnitsInProgress + weight > concurrency;
                        const allowOversubscription = (_a = options === null || options === void 0 ? void 0 : options.allowOversubscription) !== null && _a !== void 0 ? _a : false;
                        if (!allowOversubscription && wouldExceedConcurrency) {
                            // eslint-disable-next-line require-atomic-updates
                            nextIterator = currentIteratorResult;
                            break;
                        }
                        // eslint-disable-next-line require-atomic-updates
                        nextIterator = undefined;
                        concurrentUnitsInProgress += weight;
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
    /**
     * Runs a promise with a timeout. If the promise does not resolve within the specified timeout,
     * it will reject with an error.
     * @remarks If the action is completely synchronous, runWithTimeoutAsync doesn't do anything meaningful.
     */
    static async runWithTimeoutAsync({ action, timeoutMs, timeoutMessage = 'Operation timed out' }) {
        let timeoutHandle;
        const promise = Promise.resolve(action());
        const timeoutPromise = new Promise((resolve, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });
        try {
            return Promise.race([promise, timeoutPromise]);
        }
        finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
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
    async *[Symbol.asyncIterator]() {
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
                yield [this._queue[position++], callback];
            }
            else {
                // On push, the item will be added to the queue and the onPushSignal will be resolved.
                // On calling the callback, active iterations will be decremented by the callback and the
                // callbackSignal will be resolved. This means that the loop will continue if there are
                // active iterations or if there are items in the queue that haven't been yielded yet.
                await Promise.race([this._onPushSignal, callbackSignal]);
            }
        }
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