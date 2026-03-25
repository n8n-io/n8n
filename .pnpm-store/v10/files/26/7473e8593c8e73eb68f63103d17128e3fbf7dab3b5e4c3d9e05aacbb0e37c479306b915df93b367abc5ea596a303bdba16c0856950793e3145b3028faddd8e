/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IncomingHttpHeaders } from "http";
import { HttpStatus, Logger } from "@azure/msal-common";
import { IHttpRetryPolicy } from "./IHttpRetryPolicy.js";
import { LinearRetryStrategy } from "./LinearRetryStrategy.js";

export const DEFAULT_MANAGED_IDENTITY_MAX_RETRIES: number = 3; // referenced in unit test
const DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS: number = 1000;
const DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON: Array<number> = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.SERVER_ERROR,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
];

export class DefaultManagedIdentityRetryPolicy implements IHttpRetryPolicy {
    /*
     * this is defined here as a static variable despite being defined as a constant outside of the
     * class because it needs to be overridden in the unit tests so that the unit tests run faster
     */
    static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS(): number {
        return DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS;
    }

    private linearRetryStrategy: LinearRetryStrategy =
        new LinearRetryStrategy();

    async pauseForRetry(
        httpStatusCode: number,
        currentRetry: number,
        logger: Logger,
        retryAfterHeader: IncomingHttpHeaders["retry-after"]
    ): Promise<boolean> {
        if (
            DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON.includes(
                httpStatusCode
            ) &&
            currentRetry < DEFAULT_MANAGED_IDENTITY_MAX_RETRIES
        ) {
            const retryAfterDelay: number =
                this.linearRetryStrategy.calculateDelay(
                    retryAfterHeader,
                    DefaultManagedIdentityRetryPolicy.DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS
                );

            logger.verbose(
                `Retrying request in ${retryAfterDelay}ms (retry attempt: ${
                    currentRetry + 1
                })`
            );

            // pause execution for the calculated delay
            await new Promise((resolve) => {
                // retryAfterHeader value of 0 evaluates to false, and DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS will be used
                return setTimeout(resolve, retryAfterDelay);
            });

            return true;
        }

        // if the status code is not retriable or max retries have been reached, do not retry
        return false;
    }
}
