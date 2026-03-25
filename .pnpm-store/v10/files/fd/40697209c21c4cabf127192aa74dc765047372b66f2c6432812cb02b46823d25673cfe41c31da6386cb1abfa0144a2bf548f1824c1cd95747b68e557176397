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
export class AbortSignal {
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
export function abortSignal(signal) {
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
//# sourceMappingURL=AbortSignal.js.map