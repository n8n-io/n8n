// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This error is thrown when an asynchronous operation has been aborted.
 * Check for this error by testing the `name` that the name property of the
 * error matches `"AbortError"`.
 *
 * @example
 * ```ts snippet:ReadmeSampleAbortError
 * import { AbortError } from "@typespec/ts-http-runtime";
 *
 * async function doAsyncWork(options: { abortSignal: AbortSignal }): Promise<void> {
 *   if (options.abortSignal.aborted) {
 *     throw new AbortError();
 *   }
 *
 *   // do async work
 * }
 *
 * const controller = new AbortController();
 * controller.abort();
 *
 * try {
 *   doAsyncWork({ abortSignal: controller.signal });
 * } catch (e) {
 *   if (e instanceof Error && e.name === "AbortError") {
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