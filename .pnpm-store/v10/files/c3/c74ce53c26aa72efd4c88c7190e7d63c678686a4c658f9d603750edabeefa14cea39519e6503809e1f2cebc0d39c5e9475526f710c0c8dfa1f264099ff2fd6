/**
 * Options for controlling the parallelism of asynchronous operations.
 *
 * @remarks
 * Used with {@link (Async:class).(mapAsync:1)}, {@link (Async:class).(mapAsync:2)} and
 * {@link (Async:class).(forEachAsync:1)}, and {@link (Async:class).(forEachAsync:2)}.
 *
 * @public
 */
export interface IAsyncParallelismOptions {
    /**
     * Optionally used with the  {@link (Async:class).(mapAsync:1)}, {@link (Async:class).(mapAsync:2)} and
     * {@link (Async:class).(forEachAsync:1)}, and {@link (Async:class).(forEachAsync:2)} to limit the maximum
     * number of concurrent promises to the specified number.
     */
    concurrency?: number;
    /**
     * Optionally used with the {@link (Async:class).(forEachAsync:2)} to enable weighted operations where an operation can
     * take up more or less than one concurrency unit.
     */
    weighted?: boolean;
}
/**
 * @remarks
 * Used with {@link Async.runWithRetriesAsync}.
 *
 * @public
 */
export interface IRunWithRetriesOptions<TResult> {
    /**
     * The action to be performed. The action is repeatedly executed until it completes without throwing or the
     * maximum number of retries is reached.
     *
     * @param retryCount - The number of times the action has been retried.
     */
    action: (retryCount: number) => Promise<TResult> | TResult;
    /**
     * The maximum number of times the action should be retried.
     */
    maxRetries: number;
    /**
     * The delay in milliseconds between retries.
     */
    retryDelayMs?: number;
}
/**
 * @remarks
 * Used with {@link (Async:class).(forEachAsync:2)} and {@link (Async:class).(mapAsync:2)}.
 *
 * @public
 */
export interface IWeighted {
    /**
     * The weight of the element, used to determine the concurrency units that it will take up.
     *  Must be a whole number greater than or equal to 0.
     */
    weight: number;
}
/**
 * Utilities for parallel asynchronous operations, for use with the system `Promise` APIs.
 *
 * @public
 */
export declare class Async {
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.  Returns an array containing the results.
     *
     * @remarks
     * This API is similar to the system `Array#map`, except that the loop is asynchronous,
     * and the maximum number of concurrent promises can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     * @returns an array containing the result for each callback, in the same order
     *   as the original input `array`
     */
    static mapAsync<TEntry, TRetVal>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<TRetVal>, options?: (IAsyncParallelismOptions & {
        weighted?: false;
    }) | undefined): Promise<TRetVal[]>;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.  Returns an array containing the results.
     *
     * @remarks
     * This API is similar to the system `Array#map`, except that the loop is asynchronous,
     * and the maximum number of concurrent units can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}. Using the {@link IAsyncParallelismOptions.weighted}
     * option, the weight of each operation can be specified, which determines how many concurrent units it takes up.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     * @returns an array containing the result for each callback, in the same order
     *   as the original input `array`
     */
    static mapAsync<TEntry extends IWeighted, TRetVal>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<TRetVal>, options: IAsyncParallelismOptions & {
        weighted: true;
    }): Promise<TRetVal[]>;
    private static _forEachWeightedAsync;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.
     *
     * @remarks
     * This API is similar to the system `Array#forEach`, except that the loop is asynchronous,
     * and the maximum number of concurrent promises can be throttled
     * using {@link IAsyncParallelismOptions.concurrency}.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     */
    static forEachAsync<TEntry>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<void>, options?: (IAsyncParallelismOptions & {
        weighted?: false;
    }) | undefined): Promise<void>;
    /**
     * Given an input array and a `callback` function, invoke the callback to start a
     * promise for each element in the array.
     *
     * @remarks
     * This API is similar to the other `Array#forEachAsync`, except that each item can have
     * a weight that determines how many concurrent operations are allowed. The unweighted
     * `Array#forEachAsync` is a special case of this method where weight = 1 for all items.
     *
     * The maximum number of concurrent operations can still be throttled using
     * {@link IAsyncParallelismOptions.concurrency}, however it no longer determines the
     * maximum number of operations that can be in progress at once. Instead, it determines the
     * number of concurrency units that can be in progress at once. The weight of each operation
     * determines how many concurrency units it takes up. For example, if the concurrency is 2
     * and the first operation has a weight of 2, then only one more operation can be in progress.
     *
     * If `callback` throws a synchronous exception, or if it returns a promise that rejects,
     * then the loop stops immediately.  Any remaining array items will be skipped, and
     * overall operation will reject with the first error that was encountered.
     *
     * @param iterable - the array of inputs for the callback function
     * @param callback - a function that starts an asynchronous promise for an element
     *   from the array
     * @param options - options for customizing the control flow
     */
    static forEachAsync<TEntry extends IWeighted>(iterable: Iterable<TEntry> | AsyncIterable<TEntry>, callback: (entry: TEntry, arrayIndex: number) => Promise<void>, options: IAsyncParallelismOptions & {
        weighted: true;
    }): Promise<void>;
    /**
     * Return a promise that resolves after the specified number of milliseconds.
     */
    static sleepAsync(ms: number): Promise<void>;
    /**
     * Executes an async function and optionally retries it if it fails.
     */
    static runWithRetriesAsync<TResult>({ action, maxRetries, retryDelayMs }: IRunWithRetriesOptions<TResult>): Promise<TResult>;
    /**
     * Ensures that the argument is a valid {@link IWeighted}, with a `weight` argument that
     * is a positive integer or 0.
     */
    static validateWeightedIterable(operation: IWeighted): void;
    /**
     * Returns a Signal, a.k.a. a "deferred promise".
     */
    static getSignal(): [Promise<void>, () => void, (err: Error) => void];
}
/**
 * A queue that allows for asynchronous iteration. During iteration, the queue will wait until
 * the next item is pushed into the queue before yielding. If instead all queue items are consumed
 * and all callbacks have been called, the queue will return.
 *
 * @public
 */
export declare class AsyncQueue<T> implements AsyncIterable<[T, () => void]> {
    private _queue;
    private _onPushSignal;
    private _onPushResolve;
    constructor(iterable?: Iterable<T>);
    [Symbol.asyncIterator](): AsyncIterableIterator<[T, () => void]>;
    /**
     * Adds an item to the queue.
     *
     * @param item - The item to push into the queue.
     */
    push(item: T): void;
}
//# sourceMappingURL=Async.d.ts.map