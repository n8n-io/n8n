import type { AbortOptions } from "./aborterUtils.js";
/**
 * Options for the createAbortablePromise function.
 */
export interface CreateAbortablePromiseOptions extends AbortOptions {
    /** A function to be called if the promise was aborted */
    cleanupBeforeAbort?: () => void;
}
/**
 * Creates an abortable promise.
 * @param buildPromise - A function that takes the resolve and reject functions as parameters.
 * @param options - The options for the abortable promise.
 * @returns A promise that can be aborted.
 */
export declare function createAbortablePromise<T>(buildPromise: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, options?: CreateAbortablePromiseOptions): Promise<T>;
//# sourceMappingURL=createAbortablePromise.d.ts.map