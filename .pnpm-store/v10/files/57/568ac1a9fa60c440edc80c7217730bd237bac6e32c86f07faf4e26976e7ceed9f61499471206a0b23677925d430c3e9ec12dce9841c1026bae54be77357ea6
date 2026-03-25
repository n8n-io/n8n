/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { HttpStatus, Logger } from "@azure/msal-common";
import { ExponentialRetryStrategy } from "./ExponentialRetryStrategy.js";
import { IHttpRetryPolicy } from "./IHttpRetryPolicy.js";

const HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY: Array<number> = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.GONE,
    HttpStatus.TOO_MANY_REQUESTS,
];

const EXPONENTIAL_STRATEGY_NUM_RETRIES = 3;
const LINEAR_STRATEGY_NUM_RETRIES = 7;

const MIN_EXPONENTIAL_BACKOFF_MS: number = 1000;
const MAX_EXPONENTIAL_BACKOFF_MS: number = 4000;
const EXPONENTIAL_DELTA_BACKOFF_MS: number = 2000;

const HTTP_STATUS_GONE_RETRY_AFTER_MS: number = 10 * 1000; // 10 seconds

export class ImdsRetryPolicy implements IHttpRetryPolicy {
    /*
     * these are defined here as static variables despite being defined as constants outside of the
     * class because they need to be overridden in the unit tests so that the unit tests run faster
     */
    static get MIN_EXPONENTIAL_BACKOFF_MS(): number {
        return MIN_EXPONENTIAL_BACKOFF_MS;
    }
    static get MAX_EXPONENTIAL_BACKOFF_MS(): number {
        return MAX_EXPONENTIAL_BACKOFF_MS;
    }
    static get EXPONENTIAL_DELTA_BACKOFF_MS(): number {
        return EXPONENTIAL_DELTA_BACKOFF_MS;
    }
    static get HTTP_STATUS_GONE_RETRY_AFTER_MS(): number {
        return HTTP_STATUS_GONE_RETRY_AFTER_MS;
    }

    public _isNewRequest: boolean;
    set isNewRequest(value: boolean) {
        this._isNewRequest = value;
    }

    private maxRetries: number;

    private exponentialRetryStrategy: ExponentialRetryStrategy =
        new ExponentialRetryStrategy(
            ImdsRetryPolicy.MIN_EXPONENTIAL_BACKOFF_MS,
            ImdsRetryPolicy.MAX_EXPONENTIAL_BACKOFF_MS,
            ImdsRetryPolicy.EXPONENTIAL_DELTA_BACKOFF_MS
        );

    /**
     * Pauses execution for a calculated delay before retrying a request.
     *
     * @param httpStatusCode - The HTTP status code of the response.
     * @param currentRetry - The current retry attempt number.
     * @param retryAfterHeader - The value of the "retry-after" header from the response.
     * @returns A promise that resolves to a boolean indicating whether a retry should be attempted.
     */
    async pauseForRetry(
        httpStatusCode: number,
        currentRetry: number,
        logger: Logger
    ): Promise<boolean> {
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
        if (
            (HTTP_STATUS_400_CODES_FOR_EXPONENTIAL_STRATEGY.includes(
                httpStatusCode
            ) ||
                (httpStatusCode >= HttpStatus.SERVER_ERROR_RANGE_START &&
                    httpStatusCode <= HttpStatus.SERVER_ERROR_RANGE_END &&
                    currentRetry < this.maxRetries)) &&
            currentRetry < this.maxRetries
        ) {
            const retryAfterDelay: number =
                httpStatusCode === HttpStatus.GONE
                    ? ImdsRetryPolicy.HTTP_STATUS_GONE_RETRY_AFTER_MS
                    : this.exponentialRetryStrategy.calculateDelay(
                          currentRetry
                      );

            logger.verbose(
                `Retrying request in ${retryAfterDelay}ms (retry attempt: ${
                    currentRetry + 1
                })`
            );

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
