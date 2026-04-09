/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
class BoundedQueueExportPromiseHandler {
    _concurrencyLimit;
    _sendingPromises = [];
    /**
     * @param concurrencyLimit maximum promises allowed in a queue at the same time.
     */
    constructor(concurrencyLimit) {
        this._concurrencyLimit = concurrencyLimit;
    }
    pushPromise(promise) {
        if (this.hasReachedLimit()) {
            throw new Error('Concurrency Limit reached');
        }
        this._sendingPromises.push(promise);
        const popPromise = () => {
            const index = this._sendingPromises.indexOf(promise);
            void this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
    }
    hasReachedLimit() {
        return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
        await Promise.all(this._sendingPromises);
    }
}
/**
 * Promise queue for keeping track of export promises. Finished promises will be auto-dequeued.
 * Allows for awaiting all promises in the queue.
 */
export function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
}
//# sourceMappingURL=bounded-queue-export-promise-handler.js.map