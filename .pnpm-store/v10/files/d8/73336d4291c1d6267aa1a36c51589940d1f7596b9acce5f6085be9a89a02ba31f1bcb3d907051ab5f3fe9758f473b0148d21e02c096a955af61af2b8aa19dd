// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AbortSignal, abortSignal } from "./AbortSignal";
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
/**
 * An AbortController provides an AbortSignal and the associated controls to signal
 * that an asynchronous operation should be aborted.
 *
 * @example
 * Abort an operation when another event fires
 * ```ts
 * const controller = new AbortController();
 * const signal = controller.signal;
 * doAsyncWork(signal);
 * button.addEventListener('click', () => controller.abort());
 * ```
 *
 * @example
 * Share aborter cross multiple operations in 30s
 * ```ts
 * // Upload the same data to 2 different data centers at the same time,
 * // abort another when any of them is finished
 * const controller = AbortController.withTimeout(30 * 1000);
 * doAsyncWork(controller.signal).then(controller.abort);
 * doAsyncWork(controller.signal).then(controller.abort);
 *```
 *
 * @example
 * Cascaded aborting
 * ```ts
 * // All operations can't take more than 30 seconds
 * const aborter = Aborter.timeout(30 * 1000);
 *
 * // Following 2 operations can't take more than 25 seconds
 * await doAsyncWork(aborter.withTimeout(25 * 1000));
 * await doAsyncWork(aborter.withTimeout(25 * 1000));
 * ```
 */
export class AbortController {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(parentSignals) {
        this._signal = new AbortSignal();
        if (!parentSignals) {
            return;
        }
        // coerce parentSignals into an array
        if (!Array.isArray(parentSignals)) {
            // eslint-disable-next-line prefer-rest-params
            parentSignals = arguments;
        }
        for (const parentSignal of parentSignals) {
            // if the parent signal has already had abort() called,
            // then call abort on this signal as well.
            if (parentSignal.aborted) {
                this.abort();
            }
            else {
                // when the parent signal aborts, this signal should as well.
                parentSignal.addEventListener("abort", () => {
                    this.abort();
                });
            }
        }
    }
    /**
     * The AbortSignal associated with this controller that will signal aborted
     * when the abort method is called on this controller.
     *
     * @readonly
     */
    get signal() {
        return this._signal;
    }
    /**
     * Signal that any operations passed this controller's associated abort signal
     * to cancel any remaining work and throw an `AbortError`.
     */
    abort() {
        abortSignal(this._signal);
    }
    /**
     * Creates a new AbortSignal instance that will abort after the provided ms.
     * @param ms - Elapsed time in milliseconds to trigger an abort.
     */
    static timeout(ms) {
        const signal = new AbortSignal();
        const timer = setTimeout(abortSignal, ms, signal);
        // Prevent the active Timer from keeping the Node.js event loop active.
        if (typeof timer.unref === "function") {
            timer.unref();
        }
        return signal;
    }
}
//# sourceMappingURL=AbortController.js.map