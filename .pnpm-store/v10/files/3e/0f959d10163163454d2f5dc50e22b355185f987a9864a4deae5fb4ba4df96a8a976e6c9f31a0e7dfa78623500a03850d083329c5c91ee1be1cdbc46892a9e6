"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryOnServerFailure = void 0;
const errors_1 = require("../errors");
// TODO: Parameterize this class to allow for custom error handling (e.g. only retry 400 errors on Chat endpoint,
//  but not globally
/* Retry asynchronous operations.
 *
 * @param maxRetries - The maximum number of retries to attempt.
 * @param asyncFn - The asynchronous function to retry.
 */
class RetryOnServerFailure {
    constructor(asyncFn, maxRetries) {
        /*
         * Calculate the delay time for retrying an operation.
         *
         * @param attempt: The # of times the operation has been attempted.
         * @param baseDelay: The base delay time in milliseconds.
         * @param maxDelay: The maximum delay time in milliseconds.
         * @param jitterFactor: The magnitude of jitter relative to the delay.
         */
        this.calculateRetryDelay = (attempt, baseDelay = 200, maxDelay = 20000, jitterFactor = 0.25) => {
            let delay = baseDelay * 2 ** attempt; // Exponential (baseDelay * 2^attempt)
            // Apply jitter as a random percentage of the original delay; e.g.: if `jitterFactor` = 0.25 and `baseDelay` = 1000,
            // then `jitter` is 25% of `baseDelay`
            const jitter = delay * jitterFactor * (Math.random() - 0.5);
            delay += jitter;
            // Ensure delay is not negative or greater than maxDelay
            return Math.min(maxDelay, Math.max(0, delay));
        };
        if (maxRetries) {
            this.maxRetries = maxRetries;
        }
        else {
            this.maxRetries = 3;
        }
        if (this.maxRetries > 10) {
            throw new Error('Max retries cannot exceed 10');
        }
        this.asyncFn = asyncFn;
    }
    async execute(...args) {
        if (this.maxRetries < 1) {
            return this.asyncFn(...args);
        }
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const response = await this.asyncFn(...args);
                // Return immediately if the response is not a retryable error
                if (!this.isRetryError(response)) {
                    return response;
                }
                throw response; // Will catch this in next line
            }
            catch (error) {
                const mappedError = this.mapErrorIfNeeded(error);
                // If the error is not retryable, throw it immediately
                if (this.shouldStopRetrying(mappedError)) {
                    throw mappedError;
                }
                // On the last retry, throw a MaxRetriesExceededError
                if (attempt === this.maxRetries - 1) {
                    throw new errors_1.PineconeMaxRetriesExceededError(this.maxRetries);
                }
                // Wait before retrying
                await this.delay(attempt + 1);
            }
        }
        // This fallback is unnecessary, but included for type safety
        throw new errors_1.PineconeMaxRetriesExceededError(this.maxRetries);
    }
    isRetryError(response) {
        if (!response) {
            return false;
        }
        if (response) {
            if (response.name &&
                ['PineconeUnavailableError', 'PineconeInternalServerError'].includes(response.name)) {
                return true;
            }
            if (response.status && response.status >= 500) {
                return true;
            }
        }
        return false;
    }
    async delay(attempt) {
        const delayTime = this.calculateRetryDelay(attempt);
        return new Promise((resolve) => setTimeout(resolve, delayTime));
    }
    mapErrorIfNeeded(error) {
        if (error?.status) {
            return (0, errors_1.mapHttpStatusError)(error);
        }
        return error; // Return original error if no mapping is needed
    }
    shouldStopRetrying(error) {
        if (error.status) {
            return error.status < 500;
        }
        if (error.name) {
            return (error.name !== 'PineconeUnavailableError' &&
                error.name !== 'PineconeInternalServerError');
        }
        return true;
    }
}
exports.RetryOnServerFailure = RetryOnServerFailure;
//# sourceMappingURL=retries.js.map