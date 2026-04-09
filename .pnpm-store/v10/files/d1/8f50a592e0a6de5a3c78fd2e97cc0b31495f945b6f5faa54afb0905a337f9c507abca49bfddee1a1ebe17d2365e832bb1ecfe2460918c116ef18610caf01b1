"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBoundedQueueExportPromiseHandler = void 0;
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
function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
}
exports.createBoundedQueueExportPromiseHandler = createBoundedQueueExportPromiseHandler;
//# sourceMappingURL=bounded-queue-export-promise-handler.js.map