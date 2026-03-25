"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAbortError = exports.rethrowAbortError = exports.throwIfAborted = exports.isAbortError = exports.AbortError = void 0;
/**
 * Thrown when an abortable function was aborted.
 *
 * **Warning**: do not use `instanceof` with this class. Instead, use
 * `isAbortError` function.
 */
class AbortError extends Error {
    constructor() {
        super('The operation has been aborted');
        this.message = 'The operation has been aborted';
        this.name = 'AbortError';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AbortError = AbortError;
/**
 * Checks whether given `error` is an `AbortError`.
 */
function isAbortError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        error.name === 'AbortError');
}
exports.isAbortError = isAbortError;
/**
 * If `signal` is aborted, throws `AbortError`. Otherwise does nothing.
 */
function throwIfAborted(signal) {
    if (signal.aborted) {
        throw new AbortError();
    }
}
exports.throwIfAborted = throwIfAborted;
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
function rethrowAbortError(error) {
    if (isAbortError(error)) {
        throw error;
    }
    return;
}
exports.rethrowAbortError = rethrowAbortError;
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
function catchAbortError(error) {
    if (isAbortError(error)) {
        return;
    }
    throw error;
}
exports.catchAbortError = catchAbortError;
//# sourceMappingURL=AbortError.js.map