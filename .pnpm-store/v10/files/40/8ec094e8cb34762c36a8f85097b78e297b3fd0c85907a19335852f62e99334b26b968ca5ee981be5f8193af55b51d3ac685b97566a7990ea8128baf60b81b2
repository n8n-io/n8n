'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/// <reference path="../shims-public.d.ts" />
const listenersMap = new WeakMap();
const abortedMap = new WeakMap();
/**
 * An aborter instance implements AbortSignal interface, can abort HTTP requests.
 *
 * - Call AbortSignal.none to create a new AbortSignal instance that cannot be cancelled.
 * Use `AbortSignal.none` when you are required to pass a cancellation token but the operation
 * cannot or will not ever be cancelled.
 *
 * @example
 * Abort without timeout
 * ```ts
 * await doAsyncWork(AbortSignal.none);
 * ```
 */
class AbortSignal {
    constructor() {
        /**
         * onabort event listener.
         */
        this.onabort = null;
        listenersMap.set(this, []);
        abortedMap.set(this, false);
    }
    /**
     * Status of whether aborted or not.
     *
     * @readonly
     */
    get aborted() {
        if (!abortedMap.has(this)) {
            throw new TypeError("Expected `this` to be an instance of AbortSignal.");
        }
        return abortedMap.get(this);
    }
    /**
     * Creates a new AbortSignal instance that will never be aborted.
     *
     * @readonly
     */
    static get none() {
        return new AbortSignal();
    }
    /**
     * Added new "abort" event listener, only support "abort" event.
     *
     * @param _type - Only support "abort" event
     * @param listener - The listener to be added
     */
    addEventListener(
    // tslint:disable-next-line:variable-name
    _type, listener) {
        if (!listenersMap.has(this)) {
            throw new TypeError("Expected `this` to be an instance of AbortSignal.");
        }
        const listeners = listenersMap.get(this);
        listeners.push(listener);
    }
    /**
     * Remove "abort" event listener, only support "abort" event.
     *
     * @param _type - Only support "abort" event
     * @param listener - The listener to be removed
     */
    removeEventListener(
    // tslint:disable-next-line:variable-name
    _type, listener) {
        if (!listenersMap.has(this)) {
            throw new TypeError("Expected `this` to be an instance of AbortSignal.");
        }
        const listeners = listenersMap.get(this);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    /**
     * Dispatches a synthetic event to the AbortSignal.
     */
    dispatchEvent(_event) {
        throw new Error("This is a stub dispatchEvent implementation that should not be used.  It only exists for type-checking purposes.");
    }
}
/**
 * Helper to trigger an abort event immediately, the onabort and all abort event listeners will be triggered.
 * Will try to trigger abort event for all linked AbortSignal nodes.
 *
 * - If there is a timeout, the timer will be cancelled.
 * - If aborted is true, nothing will happen.
 *
 * @internal
 */
// eslint-disable-next-line @azure/azure-sdk/ts-use-interface-parameters
function abortSignal(signal) {
    if (signal.aborted) {
        return;
    }
    if (signal.onabort) {
        signal.onabort.call(signal);
    }
    const listeners = listenersMap.get(signal);
    if (listeners) {
        // Create a copy of listeners so mutations to the array
        // (e.g. via removeListener calls) don't affect the listeners
        // we invoke.
        listeners.slice().forEach((listener) => {
            listener.call(signal, { type: "abort" });
        });
    }
    abortedMap.set(signal, true);
}

// Copyright (c) Microsoft Corporation.
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
class AbortError extends Error {
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
class AbortController {
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

exports.AbortController = AbortController;
exports.AbortError = AbortError;
exports.AbortSignal = AbortSignal;
//# sourceMappingURL=index.js.map
