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
export declare class AbortError extends Error {
    constructor(message?: string);
}

/**
 * Allows the request to be aborted upon firing of the "abort" event.
 * Compatible with the browser built-in AbortSignal and common polyfills.
 */
export declare interface AbortSignalLike {
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

export { }
