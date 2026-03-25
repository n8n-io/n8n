/**
 * Wrap a promise to reject with `AbortError` once `signal` is aborted.
 *
 * Useful to wrap non-abortable promises.
 * Note that underlying process will NOT be aborted.
 */
export declare function abortable<T>(signal: AbortSignal, promise: PromiseLike<T>): Promise<T>;
