/**
 * Thrown when an abortable function was aborted.
 *
 * **Warning**: do not use `instanceof` with this class. Instead, use
 * `isAbortError` function.
 */
export class AbortError extends Error {
    constructor() {
        super('The operation has been aborted');
        this.message = 'The operation has been aborted';
        this.name = 'AbortError';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
/**
 * Checks whether given `error` is an `AbortError`.
 */
export function isAbortError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        error.name === 'AbortError');
}
/**
 * If `signal` is aborted, throws `AbortError`. Otherwise does nothing.
 */
export function throwIfAborted(signal) {
    if (signal.aborted) {
        throw new AbortError();
    }
}
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
export function rethrowAbortError(error) {
    if (isAbortError(error)) {
        throw error;
    }
    return;
}
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
export function catchAbortError(error) {
    if (isAbortError(error)) {
        return;
    }
    throw error;
}
//# sourceMappingURL=AbortError.js.map