/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { HttpStatus } from '@azure/msal-common';
import { LinearRetryStrategy } from './LinearRetryStrategy.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const DEFAULT_MANAGED_IDENTITY_MAX_RETRIES = 3; // referenced in unit test
const DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS = 1000;
const DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.SERVER_ERROR,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
];
class DefaultManagedIdentityRetryPolicy {
    constructor() {
        this.linearRetryStrategy = new LinearRetryStrategy();
    }
    /*
     * this is defined here as a static variable despite being defined as a constant outside of the
     * class because it needs to be overridden in the unit tests so that the unit tests run faster
     */
    static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS() {
        return DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS;
    }
    async pauseForRetry(httpStatusCode, currentRetry, logger, retryAfterHeader) {
        if (DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON.includes(httpStatusCode) &&
            currentRetry < DEFAULT_MANAGED_IDENTITY_MAX_RETRIES) {
            const retryAfterDelay = this.linearRetryStrategy.calculateDelay(retryAfterHeader, DefaultManagedIdentityRetryPolicy.DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS);
            logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`);
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

export { DEFAULT_MANAGED_IDENTITY_MAX_RETRIES, DefaultManagedIdentityRetryPolicy };
//# sourceMappingURL=DefaultManagedIdentityRetryPolicy.mjs.map
