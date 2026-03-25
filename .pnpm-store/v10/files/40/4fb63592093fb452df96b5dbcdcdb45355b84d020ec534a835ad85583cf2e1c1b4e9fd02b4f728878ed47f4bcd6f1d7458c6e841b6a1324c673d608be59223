import { Logger } from "@azure/msal-common";
import { IHttpRetryPolicy } from "./IHttpRetryPolicy.js";
export declare class ImdsRetryPolicy implements IHttpRetryPolicy {
    static get MIN_EXPONENTIAL_BACKOFF_MS(): number;
    static get MAX_EXPONENTIAL_BACKOFF_MS(): number;
    static get EXPONENTIAL_DELTA_BACKOFF_MS(): number;
    static get HTTP_STATUS_GONE_RETRY_AFTER_MS(): number;
    _isNewRequest: boolean;
    set isNewRequest(value: boolean);
    private maxRetries;
    private exponentialRetryStrategy;
    /**
     * Pauses execution for a calculated delay before retrying a request.
     *
     * @param httpStatusCode - The HTTP status code of the response.
     * @param currentRetry - The current retry attempt number.
     * @param retryAfterHeader - The value of the "retry-after" header from the response.
     * @returns A promise that resolves to a boolean indicating whether a retry should be attempted.
     */
    pauseForRetry(httpStatusCode: number, currentRetry: number, logger: Logger): Promise<boolean>;
}
//# sourceMappingURL=ImdsRetryPolicy.d.ts.map