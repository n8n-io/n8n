/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { HttpStatus } from '@azure/msal-common';
import { ExponentialRetryStrategy } from './ExponentialRetryStrategy.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.GONE,
    HttpStatus.TOO_MANY_REQUESTS,
];
const EXPONENTIAL_STRATEGY_NUM_RETRIES = 3;
const LINEAR_STRATEGY_NUM_RETRIES = 7;
const MIN_EXPONENTIAL_BACKOFF_MS = 1000;
const MAX_EXPONENTIAL_BACKOFF_MS = 4000;
const EXPONENTIAL_DELTA_BACKOFF_MS = 2000;
const HTTP_STATUS_GONE_RETRY_AFTER_MS = 10 * 1000; // 10 seconds
class ImdsRetryPolicy {
    constructor() {
        this.exponentialRetryStrategy = new ExponentialRetryStrategy(ImdsRetryPolicy.MIN_EXPONENTIAL_BACKOFF_MS, ImdsRetryPolicy.MAX_EXPONENTIAL_BACKOFF_MS, ImdsRetryPolicy.EXPONENTIAL_DELTA_BACKOFF_MS);
    }
    /*
     * these are defined here as static variables despite being defined as constants outside of the
     * class because they need to be overridden in the unit tests so that the unit tests run faster
     */
    static get MIN_EXPONENTIAL_BACKOFF_MS() {
        return MIN_EXPONENTIAL_BACKOFF_MS;
    }
    static get MAX_EXPONENTIAL_BACKOFF_MS() {
        return MAX_EXPONENTIAL_BACKOFF_MS;
    }
    static get EXPONENTIAL_DELTA_BACKOFF_MS() {
        return EXPONENTIAL_DELTA_BACKOFF_MS;
    }
    static get HTTP_STATUS_GONE_RETRY_AFTER_MS() {
        return HTTP_STATUS_GONE_RETRY_AFTER_MS;
    }
    set isNewRequest(value) {
        this._isNewRequest = value;
    }
    /**
     * Pauses execution for a calculated delay before retrying a request.
     *
     * @param httpStatusCode - The HTTP status code of the response.
     * @param currentRetry - The current retry attempt number.
     * @param retryAfterHeader - The value of the "retry-after" header from the response.
     * @returns A promise that resolves to a boolean indicating whether a retry should be attempted.
     */
    async pauseForRetry(httpStatusCode, currentRetry, logger) {
        if (this._isNewRequest) {
            this._isNewRequest = false;
            // calculate the maxRetries based on the status code, once per request
            this.maxRetries =
                httpStatusCode === HttpStatus.GONE
                    ? LINEAR_STRATEGY_NUM_RETRIES
                    : EXPONENTIAL_STRATEGY_NUM_RETRIES;
        }
        /**
         * (status code is one of the retriable 400 status code
         * or
         * status code is >= 500 and <= 599)
         * and
         * current count of retries is less than the max number of retries
         */
        if ((HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY.includes(httpStatusCode) ||
            (httpStatusCode >= HttpStatus.SERVER_ERROR_RANGE_START &&
                httpStatusCode <= HttpStatus.SERVER_ERROR_RANGE_END &&
                currentRetry < this.maxRetries)) &&
            currentRetry < this.maxRetries) {
            const retryAfterDelay = httpStatusCode === HttpStatus.GONE
                ? ImdsRetryPolicy.HTTP_STATUS_GONE_RETRY_AFTER_MS
                : this.exponentialRetryStrategy.calculateDelay(currentRetry);
            logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`);
            // pause execution for the calculated delay
            await new Promise((resolve) => {
                return setTimeout(resolve, retryAfterDelay);
            });
            return true;
        }
        // if the status code is not retriable or max retries have been reached, do not retry
        return false;
    }
}

export { ImdsRetryPolicy };
//# sourceMappingURL=ImdsRetryPolicy.mjs.map
