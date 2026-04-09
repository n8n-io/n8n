'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisePool = void 0;
const promise_pool_executor_1 = require("./promise-pool-executor");
class PromisePool {
    /**
     * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
     */
    constructor(items) {
        /**
         * Determine whether to store the processed items in memory.
         */
        this.shouldStoreProcessedItems = true;
        this.timeout = undefined;
        this.concurrency = 10;
        this.items = items ?? [];
        this.errorHandler = undefined;
        this.onTaskStartedHandlers = [];
        this.onTaskFinishedHandlers = [];
        this.shouldResultsCorrespond = false;
    }
    /**
     * Set the number of tasks to process concurrently in the promise pool.
     */
    withConcurrency(concurrency) {
        this.concurrency = concurrency;
        return this;
    }
    /**
     * Set the number of tasks to process concurrently in the promise pool.
     */
    static withConcurrency(concurrency) {
        return new this().withConcurrency(concurrency);
    }
    /**
     * Set the timeout in milliseconds for the pool handler.
     */
    withTaskTimeout(timeout) {
        this.timeout = timeout;
        return this;
    }
    /**
     * Set the timeout in milliseconds for the pool handler.
     */
    static withTaskTimeout(timeout) {
        return new this().withTaskTimeout(timeout);
    }
    /**
     * Set the items to be processed in the promise pool.
     */
    for(items) {
        const pool = new PromisePool(items).withConcurrency(this.concurrency);
        if (typeof this.errorHandler === 'function') {
            pool.handleError(this.errorHandler);
        }
        return typeof this.timeout === 'number'
            ? pool.withTaskTimeout(this.timeout)
            : pool;
    }
    /**
     * Set the items to be processed in the promise pool.
     */
    static for(items) {
        return new this().for(items);
    }
    /**
     * Set the error handler function to execute when an error occurs.
     */
    handleError(handler) {
        this.errorHandler = handler;
        return this;
    }
    /**
     * Assign the given callback `handler` function to run when a task starts.
     */
    onTaskStarted(handler) {
        this.onTaskStartedHandlers.push(handler);
        return this;
    }
    /**
     * Prevent PromisePool from storing the processed items in memory.
     */
    dontStoreProcessedItems() {
        this.shouldStoreProcessedItems = false;
        return this;
    }
    /**
     * Assign the given callback `handler` function to run when a task finished.
     */
    onTaskFinished(handler) {
        this.onTaskFinishedHandlers.push(handler);
        return this;
    }
    /**
     * Assign whether to keep corresponding results between source items and resulting tasks.
     */
    useCorrespondingResults() {
        this.shouldResultsCorrespond = true;
        return this;
    }
    /**
     * Starts processing the promise pool by iterating over the items
     * and running each item through the async `callback` function.
     */
    async process(callback) {
        return new promise_pool_executor_1.PromisePoolExecutor()
            .useConcurrency(this.concurrency)
            .useCorrespondingResults(this.shouldResultsCorrespond)
            .storeProcessedItems(this.shouldStoreProcessedItems)
            .withTaskTimeout(this.timeout)
            .withHandler(callback)
            .handleError(this.errorHandler)
            .onTaskStarted(this.onTaskStartedHandlers)
            .onTaskFinished(this.onTaskFinishedHandlers)
            .for(this.items)
            .start();
    }
}
exports.PromisePool = PromisePool;
PromisePool.notRun = Symbol('notRun');
PromisePool.failed = Symbol('failed');
