/**
 * Thrown when an abortable function was aborted.
 *
 * **Warning**: do not use `instanceof` with this class. Instead, use
 * `isAbortError` function.
 */
export declare class AbortError extends Error {
    constructor();
}
/**
 * Checks whether given `error` is an `AbortError`.
 */
export declare function isAbortError(error: unknown): error is Error;
/**
 * If `signal` is aborted, throws `AbortError`. Otherwise does nothing.
 */
export declare function throwIfAborted(signal: AbortSignal): void;
/**
 * If `error` is `AbortError`, throws it. Otherwise does nothing.
 *
 * Useful for `try/catch` blocks around abortable code:
 *
 *    try {
 *      await somethingAbortable(signal);
 *    } catch (err) {
 *      rethrowAbortError(err);
 *
 *      // do normal error handling
 *    }
 */
export declare function rethrowAbortError(error: unknown): void;
/**
 * If `error` is `AbortError`, does nothing. Otherwise throws it.
 *
 * Useful for invoking top-level abortable functions:
 *
 *    somethingAbortable(signal).catch(catchAbortError)
 *
 * Without `catchAbortError`, aborting would result in unhandled promise
 * rejection.
 */
export declare function catchAbortError(error: unknown): void;
