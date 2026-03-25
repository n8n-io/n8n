/**
 * Similar to `new Promise(executor)`, but allows executor to return abort
 * callback that is called once `signal` is aborted.
 *
 * Returned promise rejects with `AbortError` once `signal` is aborted.
 *
 * Callback can return a promise, e.g. for doing any async cleanup. In this
 * case, the promise returned from `execute` rejects with `AbortError` after
 * that promise fulfills.
 */
export declare function execute<T>(signal: AbortSignal, executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => () => void | PromiseLike<void>): Promise<T>;
