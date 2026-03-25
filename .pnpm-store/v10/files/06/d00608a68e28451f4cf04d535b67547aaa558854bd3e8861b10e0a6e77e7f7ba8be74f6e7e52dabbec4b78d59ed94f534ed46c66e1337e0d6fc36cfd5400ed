/// <reference path="../../shims-public.d.ts" />
/**
 * Allows the request to be aborted upon firing of the "abort" event.
 * Compatible with the browser built-in AbortSignal and common polyfills.
 */
export interface AbortSignalLike {
    /**
     * Indicates if the signal has already been aborted.
     */
    readonly aborted: boolean;
    /**
     * Add new "abort" event listener, only support "abort" event.
     */
    addEventListener(type: "abort", listener: (this: AbortSignalLike, ev: any) => any, options?: any): void;
    /**
     * Remove "abort" event listener, only support "abort" event.
     */
    removeEventListener(type: "abort", listener: (this: AbortSignalLike, ev: any) => any, options?: any): void;
}
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
export declare class AbortSignal implements AbortSignalLike {
    constructor();
    /**
     * Status of whether aborted or not.
     *
     * @readonly
     */
    get aborted(): boolean;
    /**
     * Creates a new AbortSignal instance that will never be aborted.
     *
     * @readonly
     */
    static get none(): AbortSignal;
    /**
     * onabort event listener.
     */
    onabort: ((ev?: Event) => any) | null;
    /**
     * Added new "abort" event listener, only support "abort" event.
     *
     * @param _type - Only support "abort" event
     * @param listener - The listener to be added
     */
    addEventListener(_type: "abort", listener: (this: AbortSignalLike, ev: any) => any): void;
    /**
     * Remove "abort" event listener, only support "abort" event.
     *
     * @param _type - Only support "abort" event
     * @param listener - The listener to be removed
     */
    removeEventListener(_type: "abort", listener: (this: AbortSignalLike, ev: any) => any): void;
    /**
     * Dispatches a synthetic event to the AbortSignal.
     */
    dispatchEvent(_event: Event): boolean;
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
export declare function abortSignal(signal: AbortSignal): void;
//# sourceMappingURL=AbortSignal.d.ts.map