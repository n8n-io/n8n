import { ReturnValue } from './return-value';
import { PromisePoolError } from './promise-pool-error';
import { ProcessHandler, OnProgressCallback, Statistics, Stoppable, UsesConcurrency, SomeIterable } from './contracts';
export declare class PromisePoolExecutor<T, R> implements UsesConcurrency, Stoppable, Statistics<T> {
    /**
     * Stores the internal properties.
     */
    private readonly meta;
    /**
     * The async processing function receiving each item from the `items` array.
     */
    private handler;
    /**
     * The async error handling function.
     */
    private errorHandler?;
    /**
     * The `taskStarted` handler callback functions
     */
    private onTaskStartedHandlers;
    /**
      * The `taskFinished` handler callback functions
      */
    private onTaskFinishedHandlers;
    /**
     * Creates a new promise pool executer instance with a default concurrency of 10.
     */
    constructor();
    /**
     * Set the number of tasks to process concurrently the promise pool.
     *
     * @param {Integer} concurrency
     *
     * @returns {PromisePoolExecutor}
     */
    useConcurrency(concurrency: number): this;
    /**
     * Determine whether the given `concurrency` value is valid.
     *
     * @param {Number} concurrency
     *
     * @returns {Boolean}
     */
    private isValidConcurrency;
    /**
     * Set the timeout in ms for the pool handler
     *
     * @param {Number} timeout
     *
     * @returns {PromisePool}
     */
    withTaskTimeout(timeout: number | undefined): this;
    /**
     * Returns the number of concurrently processed tasks.
     *
     * @returns {Number}
     */
    concurrency(): number;
    /**
     * Assign whether to keep corresponding results between source items and resulting tasks.
     */
    useCorrespondingResults(shouldResultsCorrespond: boolean): this;
    /**
     * Determine whether to keep corresponding results between source items and resulting tasks.
     */
    shouldUseCorrespondingResults(): boolean;
    /**
     * Returns the task timeout in milliseconds.
     */
    taskTimeout(): number | undefined;
    /**
     * Set the items to be processed in the promise pool.
     *
     * @param {Array} items
     *
     * @returns {PromisePoolExecutor}
     */
    for(items: SomeIterable<T>): this;
    /**
     * Returns the list of items to process.
     *
     * @returns {T[] | Iterable<T> | AsyncIterable<T>}
     */
    items(): SomeIterable<T>;
    /**
     * Returns the number of items to process, or `NaN` if items are not an array.
     *
     * @returns {Number}
     */
    itemsCount(): number;
    /**
     * Returns the list of active tasks.
     *
     * @returns {Array}
     */
    tasks(): any[];
    /**
     * Returns the number of currently active tasks.
     *
     * @returns {Number}
     *
     * @deprecated use the `activeTasksCount()` method (plural naming) instead
     */
    activeTaskCount(): number;
    /**
     * Returns the number of currently active tasks.
     *
     * @returns {Number}
     */
    activeTasksCount(): number;
    /**
     * Returns the list of processed items.
     *
     * @returns {T[]}
     */
    processedItems(): T[];
    /**
     * Returns the number of processed items.
     *
     * @returns {Number}
     */
    processedCount(): number;
    /**
     * Returns the percentage progress of items that have been processed, or `NaN` if items is not an array.
     */
    processedPercentage(): number;
    /**
     * Returns the list of results.
     *
     * @returns {R[]}
     */
    results(): Array<R | symbol>;
    /**
     * Returns the list of errors.
     *
     * @returns {Array<PromisePoolError<T>>}
     */
    errors(): Array<PromisePoolError<T>>;
    /**
     * Set the handler that is applied to each item.
     *
     * @param {Function} action
     *
     * @returns {PromisePoolExecutor}
     */
    withHandler(action: ProcessHandler<T, R>): this;
    /**
     * Determine whether a custom error handle is available.
     *
     * @returns {Boolean}
     */
    hasErrorHandler(): boolean;
    /**
     * Set the error handler function to execute when an error occurs.
     *
     * @param {Function} errorHandler
     *
     * @returns {PromisePoolExecutor}
     */
    handleError(handler?: (error: Error, item: T, pool: Stoppable & UsesConcurrency) => Promise<void> | void): this;
    /**
     * Set the handler function to execute when started a task.
     *
     * @param {Function} handler
     *
     * @returns {this}
     */
    onTaskStarted(handlers: Array<OnProgressCallback<T>>): this;
    /**
      * Assign the given callback `handler` function to run when a task finished.
     *
     * @param {OnProgressCallback<T>} handlers
     *
     * @returns {this}
     */
    onTaskFinished(handlers: Array<OnProgressCallback<T>>): this;
    /**
     * Determines whether the number of active tasks is greater or equal to the concurrency limit.
     *
     * @returns {Boolean}
     */
    hasReachedConcurrencyLimit(): boolean;
    /**
     * Stop a promise pool processing.
     */
    stop(): void;
    /**
     * Mark the promise pool as stopped.
     *
     * @returns {PromisePoolExecutor}
     */
    markAsStopped(): this;
    /**
     * Determine whether the pool is stopped.
     *
     * @returns {Boolean}
     */
    isStopped(): boolean;
    /**
     * Start processing the promise pool.
     *
     * @returns {ReturnValue}
     */
    start(): Promise<any>;
    /**
     * Determine whether the pool should stop.
     *
     * @returns {PromisePoolExecutor}
     *
     * @throws
     */
    validateInputs(): this;
    private areItemsValid;
    /**
     * Prefill the results array with `notRun` symbol values if results should correspond.
     */
    private prepareResultsArray;
    /**
     * Starts processing the promise pool by iterating over the items
     * and running each item through the async `callback` function.
     *
     * @param {Function} callback
     *
     * @returns {Promise}
     */
    process(): Promise<ReturnValue<T, R>>;
    /**
     * Wait for one of the active tasks to finish processing.
     */
    waitForProcessingSlot(): Promise<void>;
    /**
     * Wait for the next, currently active task to finish processing.
     */
    waitForActiveTaskToFinish(): Promise<void>;
    /**
     * Create a processing function for the given `item`.
     *
     * @param {T} item
     * @param {number} index
     */
    startProcessing(item: T, index: number): void;
    /**
     * Ensures a returned promise for the processing of the given `item`.
     *
     * @param {T} item
     * @param {number} index
     *
     * @returns {*}
     */
    createTaskFor(item: T, index: number): Promise<any>;
    /**
     * Returns a tuple of a timer function and a canceller function that
     * times-out after the configured task timeout.
     */
    private createTaskTimeout;
    /**
     * Save the given calculation `result`, possibly at the provided `position`.
     *
     * @param {*} result
     * @param {number} position
     *
     * @returns {PromisePoolExecutor}
     */
    save(result: any, position: number): this;
    /**
     * Remove the given `task` from the list of active tasks.
     *
     * @param {Promise} task
     */
    removeActive(task: Promise<void>): this;
    /**
     * Create and save an error for the the given `item`.
     *
     * @param {Error} error
     * @param {T} item
     * @param {number} index
     */
    handleErrorFor(error: Error, item: T, index: number): Promise<void>;
    /**
     * Determine whether the given `error` is a `StopThePromisePoolError` instance.
     *
     * @param {Error} error
     *
     * @returns {Boolean}
     */
    isStoppingThePoolError(error: Error): boolean;
    /**
     * Determine whether the given `error` is a `ValidationError` instance.
     *
     * @param {Error} error
     *
     * @returns {Boolean}
     */
    isValidationError(error: Error): boolean;
    /**
     * Run the user’s error handler, if available.
     *
     * @param {Error} processingError
     * @param {T} item
     */
    runErrorHandlerFor(processingError: Error, item: T): Promise<void>;
    /**
     * Run the onTaskStarted handlers.
     */
    runOnTaskStartedHandlers(item: T): void;
    /**
     * Run the onTaskFinished handlers.
     */
    runOnTaskFinishedHandlers(item: T): void;
    /**
     * Rethrow the given `error` if it’s not an instance of `StopThePromisePoolError`.
     *
     * @param {Error} error
     */
    rethrowIfNotStoppingThePool(error: Error): void;
    /**
     * Create and save an error for the the given `item`.
     *
     * @param {T} item
     */
    saveErrorFor(error: Error, item: T): void;
    /**
     * Wait for all active tasks to finish. Once all the tasks finished
     * processing, returns an object containing the results and errors.
     *
     * @returns {Object}
     */
    drained(): Promise<ReturnValue<T, any>>;
    /**
     * Wait for all of the active tasks to finish processing.
     */
    drainActiveTasks(): Promise<void>;
}
