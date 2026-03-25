type ResponseCallback = (response?: Response) => Promise<boolean>;
export interface AsyncCallerParams {
    /**
     * The maximum number of concurrent calls that can be made.
     * Defaults to `Infinity`, which means no limit.
     */
    maxConcurrency?: number;
    /**
     * The maximum number of retries that can be made for a single call,
     * with an exponential backoff between each attempt. Defaults to 6.
     */
    maxRetries?: number;
    /**
     * The maximum size of the queue buffer in bytes. When the queue reaches this size,
     * new calls will be dropped instead of queued.
     * If not specified, no limit is enforced.
     */
    maxQueueSizeBytes?: number;
    onFailedResponseHook?: ResponseCallback;
    debug?: boolean;
}
export interface AsyncCallerCallOptions {
    signal?: AbortSignal;
    /**
     * The size of this call in bytes, used for queue size tracking.
     * If not provided, size tracking is skipped for this call.
     */
    sizeBytes?: number;
}
/**
 * A class that can be used to make async calls with concurrency and retry logic.
 *
 * This is useful for making calls to any kind of "expensive" external resource,
 * be it because it's rate-limited, subject to network issues, etc.
 *
 * Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
 * to `Infinity`. This means that by default, all calls will be made in parallel.
 *
 * Retries are limited by the `maxRetries` parameter, which defaults to 6. This
 * means that by default, each call will be retried up to 6 times, with an
 * exponential backoff between each attempt.
 */
export declare class AsyncCaller {
    protected maxConcurrency: AsyncCallerParams["maxConcurrency"];
    protected maxRetries: AsyncCallerParams["maxRetries"];
    protected maxQueueSizeBytes: AsyncCallerParams["maxQueueSizeBytes"];
    queue: typeof import("p-queue")["default"]["prototype"];
    private onFailedResponseHook?;
    private queueSizeBytes;
    constructor(params: AsyncCallerParams);
    call<A extends any[], T extends (...args: A) => Promise<any>>(callable: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
    callWithOptions<A extends any[], T extends (...args: A) => Promise<any>>(options: AsyncCallerCallOptions, callable: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
}
export {};
