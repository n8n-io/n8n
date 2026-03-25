import { ReturnValue } from './return-value';
import { ErrorHandler, ProcessHandler, OnProgressCallback, SomeIterable } from './contracts';
export declare class PromisePool<T, ShouldUseCorrespondingResults extends boolean = false> {
    /**
     * The processable items.
     */
    private readonly items;
    /**
     * The number of promises running concurrently.
     */
    private concurrency;
    /**
     * Determine whether to put a task’s result at the same position in the result
     * array as its related source item has in the source array. Failing tasks
     * and those items that didn’t run carry a related symbol as a value.
     */
    private shouldResultsCorrespond;
    /**
     * The maximum timeout in milliseconds for the item handler, or `undefined` to disable.
     */
    private timeout;
    /**
     * The error handler callback function
     */
    private errorHandler?;
    /**
     * The `taskStarted` handler callback functions
     */
    private readonly onTaskStartedHandlers;
    /**
     * The `taskFinished` handler callback functions
     */
    private readonly onTaskFinishedHandlers;
    static readonly notRun: symbol;
    static readonly failed: symbol;
    /**
     * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
     *
     * @param {Object} options
     */
    constructor(items?: SomeIterable<T>);
    /**
     * Set the number of tasks to process concurrently in the promise pool.
     *
     * @param {Integer} concurrency
     *
     * @returns {PromisePool}
     */
    withConcurrency(concurrency: number): PromisePool<T>;
    /**
     * Set the number of tasks to process concurrently in the promise pool.
     *
     * @param {Number} concurrency
     *
     * @returns {PromisePool}
     */
    static withConcurrency(concurrency: number): PromisePool<unknown>;
    /**
     * Set the timeout in milliseconds for the pool handler.
     *
     * @param {Number} timeout
     *
     * @returns {PromisePool}
     */
    withTaskTimeout(timeout: number): PromisePool<T>;
    /**
     * Set the timeout in milliseconds for the pool handler.
     *
     * @param {Number} timeout
     *
     * @returns {PromisePool}
     */
    static withTaskTimeout(timeout: number): PromisePool<unknown>;
    /**
     * Set the items to be processed in the promise pool.
     *
     * @param {SomeIterable<ItemType>} items
     *
     * @returns {PromisePool}
     */
    for<ItemType>(items: SomeIterable<ItemType>): PromisePool<ItemType>;
    /**
     * Set the items to be processed in the promise pool.
     *
     * @param {T[] | Iterable<T> | AsyncIterable<T>} items
     *
     * @returns {PromisePool}
     */
    static for<T>(items: SomeIterable<T>): PromisePool<T>;
    /**
     * Set the error handler function to execute when an error occurs.
     *
     * @param {ErrorHandler<T>} handler
     *
     * @returns {PromisePool}
     */
    handleError(handler: ErrorHandler<T>): PromisePool<T>;
    /**
     * Assign the given callback `handler` function to run when a task starts.
     *
     * @param {OnProgressCallback<T>} handler
     *
     * @returns {PromisePool}
     */
    onTaskStarted(handler: OnProgressCallback<T>): PromisePool<T>;
    /**
     * Assign the given callback `handler` function to run when a task finished.
     *
     * @param {OnProgressCallback<T>} handler
     *
     * @returns {PromisePool}
     */
    onTaskFinished(handler: OnProgressCallback<T>): PromisePool<T>;
    /**
     * Assign whether to keep corresponding results between source items and resulting tasks.
     */
    useCorrespondingResults(): PromisePool<T, true>;
    /**
     * Starts processing the promise pool by iterating over the items
     * and running each item through the async `callback` function.
     *
     * @param {ProcessHandler} The async processing function receiving each item from the `items` array.
     *
     * @returns Promise<{ results, errors }>
     */
    process<ResultType, ErrorType = any>(callback: ProcessHandler<T, ResultType>): Promise<ReturnValue<T, ShouldUseCorrespondingResults extends true ? ResultType | symbol : ResultType, ErrorType>>;
}
