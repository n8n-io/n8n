import type { AbortSignalLike } from "@azure/abort-controller";
/**
 * Options related to abort controller.
 */
export interface AbortOptions {
    /**
     * The abortSignal associated with containing operation.
     */
    abortSignal?: AbortSignalLike;
    /**
     * The abort error message associated with containing operation.
     */
    abortErrorMsg?: string;
}
/**
 * Represents a function that returns a promise that can be aborted.
 */
export type AbortablePromiseBuilder<T> = (abortOptions: {
    abortSignal?: AbortSignalLike;
}) => Promise<T>;
/**
 * promise.race() wrapper that aborts rest of promises as soon as the first promise settles.
 */
export declare function cancelablePromiseRace<T extends unknown[]>(abortablePromiseBuilders: AbortablePromiseBuilder<T[number]>[], options?: {
    abortSignal?: AbortSignalLike;
}): Promise<T[number]>;
//# sourceMappingURL=aborterUtils.d.ts.map