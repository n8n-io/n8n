/**
 * Callback used by {@link LegacyAdapters}.
 * @public
 */
export type LegacyCallback<TResult, TError> = (error: TError | null | undefined, result: TResult) => void;
/**
 * Helper functions used when interacting with APIs that do not follow modern coding practices.
 * @public
 */
export declare class LegacyAdapters {
    /**
     * This function wraps a function with a callback in a promise.
     */
    static convertCallbackToPromise<TResult, TError>(fn: (cb: LegacyCallback<TResult, TError>) => void): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1>(fn: (arg1: TArg1, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2>(fn: (arg1: TArg1, arg2: TArg2, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2, TArg3>(fn: (arg1: TArg1, arg2: TArg2, arg3: TArg3, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2, arg3: TArg3): Promise<TResult>;
    static convertCallbackToPromise<TResult, TError, TArg1, TArg2, TArg3, TArg4>(fn: (arg1: TArg1, arg2: TArg2, arg3: TArg3, arg4: TArg4, cb: LegacyCallback<TResult, TError>) => void, arg1: TArg1, arg2: TArg2, arg3: TArg3, arg4: TArg4): Promise<TResult>;
    /**
     * Normalizes an object into an `Error` object.
     */
    static scrubError(error: Error | string | any): Error;
}
//# sourceMappingURL=LegacyAdapters.d.ts.map