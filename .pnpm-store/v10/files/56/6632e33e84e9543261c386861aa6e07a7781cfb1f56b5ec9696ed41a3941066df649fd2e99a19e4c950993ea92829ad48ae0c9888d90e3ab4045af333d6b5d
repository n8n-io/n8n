'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisePool = void 0;
const promise_pool_executor_1 = require("./promise-pool-executor");
class PromisePool {
    /**
     * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
     *
     * @param {Object} options
     */
    constructor(items) {
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
     *
     * @param {Integer} concurrency
     *
     * @returns {PromisePool}
     */
    withConcurrency(concurrency) {
        this.concurrency = concurrency;
        return this;
    }
    /**
     * Set the number of tasks to process concurrently in the promise pool.
     *
     * @param {Number} concurrency
     *
     * @returns {PromisePool}
     */
    static withConcurrency(concurrency) {
        return new this().withConcurrency(concurrency);
    }
    /**
     * Set the timeout in milliseconds for the pool handler.
     *
     * @param {Number} timeout
     *
     * @returns {PromisePool}
     */
    withTaskTimeout(timeout) {
        this.timeout = timeout;
        return this;
    }
    /**
     * Set the timeout in milliseconds for the pool handler.
     *
     * @param {Number} timeout
     *
     * @returns {PromisePool}
     */
    static withTaskTimeout(timeout) {
        return new this().withTaskTimeout(timeout);
    }
    /**
     * Set the items to be processed in the promise pool.
     *
     * @param {SomeIterable<ItemType>} items
     *
     * @returns {PromisePool}
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
     *
     * @param {T[] | Iterable<T> | AsyncIterable<T>} items
     *
     * @returns {PromisePool}
     */
    static for(items) {
        return new this().for(items);
    }
    /**
     * Set the error handler function to execute when an error occurs.
     *
     * @param {ErrorHandler<T>} handler
     *
     * @returns {PromisePool}
     */
    handleError(handler) {
        this.errorHandler = handler;
        return this;
    }
    /**
     * Assign the given callback `handler` function to run when a task starts.
     *
     * @param {OnProgressCallback<T>} handler
     *
     * @returns {PromisePool}
     */
    onTaskStarted(handler) {
        this.onTaskStartedHandlers.push(handler);
        return this;
    }
    /**
     * Assign the given callback `handler` function to run when a task finished.
     *
     * @param {OnProgressCallback<T>} handler
     *
     * @returns {PromisePool}
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
     *
     * @param {ProcessHandler} The async processing function receiving each item from the `items` array.
     *
     * @returns Promise<{ results, errors }>
     */
    async process(callback) {
        return new promise_pool_executor_1.PromisePoolExecutor()
            .useConcurrency(this.concurrency)
            .useCorrespondingResults(this.shouldResultsCorrespond)
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
