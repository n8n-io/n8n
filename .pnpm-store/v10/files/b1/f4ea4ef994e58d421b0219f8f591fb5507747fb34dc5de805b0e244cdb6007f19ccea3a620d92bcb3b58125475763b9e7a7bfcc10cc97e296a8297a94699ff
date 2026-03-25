export type BackoffStrategy = {
    initialInterval: number;
    maxInterval: number;
    exponent: number;
    maxElapsedTime: number;
};
export type RetryConfig = {
    strategy: "none";
} | {
    strategy: "backoff";
    backoff?: BackoffStrategy;
    retryConnectionErrors?: boolean;
};
/**
 * PermanentError is an error that is not recoverable. Throwing this error will
 * cause a retry loop to terminate.
 */
export declare class PermanentError extends Error {
    /** The underlying cause of the error. */
    readonly cause: unknown;
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * TemporaryError is an error is used to signal that an HTTP request can be
 * retried as part of a retry loop. If retry attempts are exhausted and this
 * error is thrown, the response will be returned to the caller.
 */
export declare class TemporaryError extends Error {
    response: Response;
    constructor(message: string, response: Response);
}
export declare function retry(fetchFn: () => Promise<Response>, options: {
    config: RetryConfig;
    statusCodes: string[];
}): Promise<Response>;
//# sourceMappingURL=retries.d.ts.map