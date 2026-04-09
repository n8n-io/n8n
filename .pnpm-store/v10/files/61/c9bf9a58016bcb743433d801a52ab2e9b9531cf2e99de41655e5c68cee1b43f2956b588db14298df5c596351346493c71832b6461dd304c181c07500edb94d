'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisePoolExecutor = void 0;
const promise_pool_1 = require("./promise-pool");
const validation_error_1 = require("./validation-error");
const promise_pool_error_1 = require("./promise-pool-error");
const stop_the_promise_pool_error_1 = require("./stop-the-promise-pool-error");
class PromisePoolExecutor {
    /**
     * Creates a new promise pool executer instance with a default concurrency of 10.
     */
    constructor() {
        this.meta = {
            tasks: [],
            items: [],
            errors: [],
            results: [],
            stopped: false,
            concurrency: 10,
            shouldResultsCorrespond: false,
            processedItems: [],
            processedItemsCounter: 0,
            taskTimeout: 0,
            shouldStoreProcessedItems: true
        };
        this.handler = (item) => item;
        this.errorHandler = undefined;
        this.onTaskStartedHandlers = [];
        this.onTaskFinishedHandlers = [];
    }
    /**
     * Set the number of tasks to process concurrently the promise pool.
     */
    useConcurrency(concurrency) {
        if (!this.isValidConcurrency(concurrency)) {
            throw validation_error_1.ValidationError.createFrom(`"concurrency" must be a number, 1 or up. Received "${concurrency}" (${typeof concurrency})`);
        }
        this.meta.concurrency = concurrency;
        return this;
    }
    /**
     * Set whether to store the processed items in memory.
     */
    storeProcessedItems(shouldStoreProcessedItems = true) {
        this.meta.shouldStoreProcessedItems = shouldStoreProcessedItems;
        return this;
    }
    /**
     * Determine whether to store the processed items in memory.
     */
    shouldStoreProcessedItems() {
        return this.meta.shouldStoreProcessedItems;
    }
    /**
     * Determine whether the given `concurrency` value is valid.
     */
    isValidConcurrency(concurrency) {
        return typeof concurrency === 'number' && concurrency >= 1;
    }
    /**
     * Set the timeout in ms for the pool handler
     */
    withTaskTimeout(timeout) {
        this.meta.taskTimeout = timeout;
        return this;
    }
    /**
     * Returns the number of concurrently processed tasks.
     */
    concurrency() {
        return this.meta.concurrency;
    }
    /**
     * Assign whether to keep corresponding results between source items and resulting tasks.
     */
    useCorrespondingResults(shouldResultsCorrespond) {
        this.meta.shouldResultsCorrespond = shouldResultsCorrespond;
        return this;
    }
    /**
     * Determine whether to keep corresponding results between source items and resulting tasks.
     */
    shouldUseCorrespondingResults() {
        return this.meta.shouldResultsCorrespond;
    }
    /**
     * Returns the task timeout in milliseconds.
     */
    taskTimeout() {
        return this.meta.taskTimeout;
    }
    /**
     * Set the items to be processed in the promise pool.
     */
    for(items) {
        this.meta.items = items;
        return this;
    }
    /**
     * Returns the list of items to process.
     */
    items() {
        return this.meta.items;
    }
    /**
     * Returns the number of items to process, or `NaN` if items are not an array.
     */
    itemsCount() {
        const items = this.items();
        return Array.isArray(items) ? items.length : NaN;
    }
    /**
     * Returns the list of active tasks.
     */
    tasks() {
        return this.meta.tasks;
    }
    /**
     * Returns the number of currently active tasks.
     *
     * @deprecated use the `activeTasksCount()` method (plural naming) instead
     */
    activeTaskCount() {
        return this.activeTasksCount();
    }
    /**
     * Returns the number of currently active tasks.
     */
    activeTasksCount() {
        return this.tasks().length;
    }
    /**
     * Returns the list of processed items.
     */
    processedItems() {
        return this.meta.processedItems;
    }
    /**
     * Flush the processed items.
     */
    flushProcessedItems() {
        this.meta.processedItems = [];
    }
    /**
     * Increment the processed items counter.
     */
    incrementProcessedItemsCounter() {
        this.meta.processedItemsCounter += 1;
    }
    /**
     * Returns the number of processed items.
     */
    processedCount() {
        return this.meta.processedItemsCounter;
    }
    /**
     * Returns the percentage progress of items that have been processed, or `NaN` if items is not an array.
     */
    processedPercentage() {
        return (this.processedCount() / this.itemsCount()) * 100;
    }
    /**
     * Returns the list of results.
     */
    results() {
        return this.meta.results;
    }
    /**
     * Returns the list of errors.
     */
    errors() {
        return this.meta.errors;
    }
    /**
     * Set the handler that is applied to each item.
     */
    withHandler(action) {
        this.handler = action;
        return this;
    }
    /**
     * Determine whether a custom error handle is available.
     */
    hasErrorHandler() {
        return !!this.errorHandler;
    }
    /**
     * Set the error handler function to execute when an error occurs.
     */
    handleError(handler) {
        this.errorHandler = handler;
        return this;
    }
    /**
     * Set the handler function to execute when started a task.
     */
    onTaskStarted(handlers) {
        this.onTaskStartedHandlers = handlers;
        return this;
    }
    /**
      * Assign the given callback `handler` function to run when a task finished.
     */
    onTaskFinished(handlers) {
        this.onTaskFinishedHandlers = handlers;
        return this;
    }
    /**
     * Determines whether the number of active tasks is greater or equal to the concurrency limit.
     */
    hasReachedConcurrencyLimit() {
        return this.activeTasksCount() >= this.concurrency();
    }
    /**
     * Stop a promise pool processing.
     */
    stop() {
        this.markAsStopped();
        throw new stop_the_promise_pool_error_1.StopThePromisePoolError();
    }
    /**
     * Mark the promise pool as stopped.
     */
    markAsStopped() {
        this.meta.stopped = true;
        return this;
    }
    /**
     * Determine whether the pool is stopped.
     */
    isStopped() {
        return this.meta.stopped;
    }
    /**
     * Start processing the promise pool.
     */
    async start() {
        return await this
            .validateInputs()
            .prepareResultsArray()
            .process();
    }
    /**
     * Ensure that the given input values are valid or throw an error otherwise.
     */
    validateInputs() {
        if (typeof this.handler !== 'function') {
            throw validation_error_1.ValidationError.createFrom('The first parameter for the .process(fn) method must be a function');
        }
        const timeout = this.taskTimeout();
        if (!(timeout == null || (typeof timeout === 'number' && timeout >= 0))) {
            throw validation_error_1.ValidationError.createFrom(`"timeout" must be undefined or a number. A number must be 0 or up. Received "${String(timeout)}" (${typeof timeout})`);
        }
        if (!this.areItemsValid()) {
            throw validation_error_1.ValidationError.createFrom(`"items" must be an array, an iterable or an async iterable. Received "${typeof this.items()}"`);
        }
        if (this.errorHandler && typeof this.errorHandler !== 'function') {
            throw validation_error_1.ValidationError.createFrom(`The error handler must be a function. Received "${typeof this.errorHandler}"`);
        }
        this.onTaskStartedHandlers.forEach(handler => {
            if (handler && typeof handler !== 'function') {
                throw validation_error_1.ValidationError.createFrom(`The onTaskStarted handler must be a function. Received "${typeof handler}"`);
            }
        });
        this.onTaskFinishedHandlers.forEach(handler => {
            if (handler && typeof handler !== 'function') {
                throw validation_error_1.ValidationError.createFrom(`The error handler must be a function. Received "${typeof handler}"`);
            }
        });
        return this;
    }
    /**
     * Determine whether the provided items are processable by the pool. We’re
     * handling arrays and (async) iterables. Everything else is not valid.
     */
    areItemsValid() {
        const items = this.items();
        return Array.isArray(items) ||
            typeof items[Symbol.iterator] === 'function' ||
            typeof items[Symbol.asyncIterator] === 'function';
    }
    /**
     * Prefill the results array with `notRun` symbol values if results should correspond.
     */
    prepareResultsArray() {
        const items = this.items();
        if (Array.isArray(items) && this.shouldUseCorrespondingResults()) {
            this.meta.results = Array(items.length).fill(promise_pool_1.PromisePool.notRun);
        }
        return this;
    }
    /**
     * Starts processing the promise pool by iterating over the items
     * and running each item through the async `callback` function.
     */
    async process() {
        let index = 0;
        for await (const item of this.items()) {
            if (this.isStopped()) {
                break;
            }
            if (this.shouldUseCorrespondingResults()) {
                this.results()[index] = promise_pool_1.PromisePool.notRun;
            }
            this.startProcessing(item, index);
            index += 1;
            // don't consume the next item from iterable
            // until there's a free slot for a new task
            await this.waitForProcessingSlot();
        }
        return await this.drained();
    }
    /**
     * Wait for one of the active tasks to finish processing.
     */
    async waitForProcessingSlot() {
        /**
         * We’re using a while loop here because it’s possible to decrease the pool’s
         * concurrency at runtime. We need to wait for as many tasks as needed to
         * finish processing before moving on to process the remaining tasks.
         */
        while (this.hasReachedConcurrencyLimit()) {
            await this.waitForActiveTaskToFinish();
        }
    }
    /**
     * Wait for the next, currently active task to finish processing.
     */
    async waitForActiveTaskToFinish() {
        await Promise.race(this.tasks());
    }
    /**
     * Create a processing function for the given `item`.
     */
    startProcessing(item, index) {
        const task = this.createTaskFor(item, index)
            .then(result => {
            this.save(result, index).removeActive(task);
        })
            .catch(async (error) => {
            await this.handleErrorFor(error, item, index);
            this.removeActive(task);
        })
            .finally(() => {
            if (this.shouldStoreProcessedItems()) {
                this.processedItems().push(item);
            }
            this.incrementProcessedItemsCounter();
            this.runOnTaskFinishedHandlers(item);
        });
        this.tasks().push(task);
        this.runOnTaskStartedHandlers(item);
    }
    /**
     * Ensures a returned promise for the processing of the given `item`.
     */
    async createTaskFor(item, index) {
        if (this.taskTimeout() === undefined) {
            return this.handler(item, index, this);
        }
        const [timer, canceller] = this.createTaskTimeout(item);
        return Promise.race([
            this.handler(item, index, this),
            timer(),
        ]).finally(canceller);
    }
    /**
     * Returns a tuple of a timer function and a canceller function that
     * times-out after the configured task timeout.
     */
    createTaskTimeout(item) {
        let timerId;
        const timer = async () => new Promise((_resolve, reject) => {
            timerId = setTimeout(() => {
                reject(new promise_pool_error_1.PromisePoolError(`Task in promise pool timed out after ${this.taskTimeout()}ms`, item));
            }, this.taskTimeout());
        });
        const canceller = () => clearTimeout(timerId);
        return [timer, canceller];
    }
    /**
     * Save the given calculation `result`, possibly at the provided `position`.
     */
    save(result, position) {
        this.shouldUseCorrespondingResults()
            ? this.results()[position] = result
            : this.results().push(result);
        return this;
    }
    /**
     * Remove the given `task` from the list of active tasks.
     */
    removeActive(task) {
        this.tasks().splice(this.tasks().indexOf(task), 1);
        return this;
    }
    /**
     * Create and save an error for the the given `item`.
     */
    async handleErrorFor(error, item, index) {
        if (this.shouldUseCorrespondingResults()) {
            this.results()[index] = promise_pool_1.PromisePool.failed;
        }
        if (this.isStoppingThePoolError(error)) {
            return;
        }
        if (this.isValidationError(error)) {
            this.markAsStopped();
            throw error;
        }
        this.hasErrorHandler()
            ? await this.runErrorHandlerFor(error, item)
            : this.saveErrorFor(error, item);
    }
    /**
     * Determine whether the given `error` is a `StopThePromisePoolError` instance.
     */
    isStoppingThePoolError(error) {
        return error instanceof stop_the_promise_pool_error_1.StopThePromisePoolError;
    }
    /**
     * Determine whether the given `error` is a `ValidationError` instance.
     */
    isValidationError(error) {
        return error instanceof validation_error_1.ValidationError;
    }
    /**
     * Run the user’s error handler, if available.
     */
    async runErrorHandlerFor(processingError, item) {
        try {
            await this.errorHandler?.(processingError, item, this);
        }
        catch (error) {
            this.rethrowIfNotStoppingThePool(error);
        }
    }
    /**
     * Run the onTaskStarted handlers.
     */
    runOnTaskStartedHandlers(item) {
        this.onTaskStartedHandlers.forEach(handler => {
            handler(item, this);
        });
    }
    /**
     * Run the onTaskFinished handlers.
     */
    runOnTaskFinishedHandlers(item) {
        this.onTaskFinishedHandlers.forEach(handler => {
            handler(item, this);
        });
    }
    /**
     * Rethrow the given `error` if it’s not an instance of `StopThePromisePoolError`.
     */
    rethrowIfNotStoppingThePool(error) {
        if (this.isStoppingThePoolError(error)) {
            return;
        }
        throw error;
    }
    /**
     * Create and save an error for the the given `item`.
     */
    saveErrorFor(error, item) {
        this.errors().push(promise_pool_error_1.PromisePoolError.createFrom(error, item));
    }
    /**
     * Wait for all active tasks to finish. Once all the tasks finished
     * processing, returns an object containing the results and errors.
     */
    async drained() {
        await this.drainActiveTasks();
        return {
            errors: this.errors(),
            results: this.results()
        };
    }
    /**
     * Wait for all of the active tasks to finish processing.
     */
    async drainActiveTasks() {
        await Promise.all(this.tasks());
    }
}
exports.PromisePoolExecutor = PromisePoolExecutor;
