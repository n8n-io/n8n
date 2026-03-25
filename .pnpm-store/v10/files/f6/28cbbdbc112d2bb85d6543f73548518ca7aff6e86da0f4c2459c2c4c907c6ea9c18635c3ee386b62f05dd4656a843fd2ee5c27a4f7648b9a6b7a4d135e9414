// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * This error is thrown when an asynchronous operation has been aborted.
 * Check for this error by testing the `name` that the name property of the
 * error matches `"AbortError"`.
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * controller.abort();
 * try {
 *   doAsyncWork(controller.signal)
 * } catch (e) {
 *   if (e.name === 'AbortError') {
 *     // handle abort error here.
 *   }
 * }
 * ```
 */
export class AbortError extends Error {
    constructor(message) {
        super(message);
        this.name = "AbortError";
    }
}
//# sourceMappingURL=AbortError.js.map