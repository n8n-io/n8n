import type { AbortSignalLike } from "@azure/abort-controller";
/**
 * Creates a native AbortSignal which reflects the state of the provided AbortSignalLike.
 * If the AbortSignalLike is already a native AbortSignal, it is returned as is.
 * @param abortSignalLike - The AbortSignalLike to wrap.
 * @returns - An object containing the native AbortSignal and an optional cleanup function. The cleanup function should be called when the AbortSignal is no longer needed.
 */
export declare function wrapAbortSignalLike(abortSignalLike: AbortSignalLike): {
    abortSignal: AbortSignal;
    cleanup?: () => void;
};
//# sourceMappingURL=wrapAbortSignal.d.ts.map