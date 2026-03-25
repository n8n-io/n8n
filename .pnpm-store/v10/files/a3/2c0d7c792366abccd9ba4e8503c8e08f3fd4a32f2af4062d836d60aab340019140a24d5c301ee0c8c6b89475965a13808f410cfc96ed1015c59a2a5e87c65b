// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AbortError } from "@azure/abort-controller";
import { isRestError, RestError } from "@azure/core-rest-pipeline";
import { getErrorMessage } from "@azure/core-util";
import { URLConstants } from "../utils/constants";
import { delay, setURLHost, setURLParameter } from "../utils/utils.common";
import { logger } from "../log";
/**
 * Name of the {@link storageRetryPolicy}
 */
export const storageRetryPolicyName = "storageRetryPolicy";
/**
 * RetryPolicy types.
 */
export var StorageRetryPolicyType;
(function (StorageRetryPolicyType) {
    /**
     * Exponential retry. Retry time delay grows exponentially.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["EXPONENTIAL"] = 0] = "EXPONENTIAL";
    /**
     * Linear retry. Retry time delay grows linearly.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["FIXED"] = 1] = "FIXED";
})(StorageRetryPolicyType || (StorageRetryPolicyType = {}));
// Default values of StorageRetryOptions
const DEFAULT_RETRY_OPTIONS = {
    maxRetryDelayInMs: 120 * 1000,
    maxTries: 4,
    retryDelayInMs: 4 * 1000,
    retryPolicyType: StorageRetryPolicyType.EXPONENTIAL,
    secondaryHost: "",
    tryTimeoutInMs: undefined, // Use server side default timeout strategy
};
const retriableErrors = [
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOENT",
    "ENOTFOUND",
    "TIMEOUT",
    "EPIPE",
    "REQUEST_SEND_ERROR",
];
const RETRY_ABORT_ERROR = new AbortError("The operation was aborted.");
/**
 * Retry policy with exponential retry and linear retry implemented.
 */
export function storageRetryPolicy(options = {}) {
    var _a, _b, _c, _d, _e, _f;
    const retryPolicyType = (_a = options.retryPolicyType) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_OPTIONS.retryPolicyType;
    const maxTries = (_b = options.maxTries) !== null && _b !== void 0 ? _b : DEFAULT_RETRY_OPTIONS.maxTries;
    const retryDelayInMs = (_c = options.retryDelayInMs) !== null && _c !== void 0 ? _c : DEFAULT_RETRY_OPTIONS.retryDelayInMs;
    const maxRetryDelayInMs = (_d = options.maxRetryDelayInMs) !== null && _d !== void 0 ? _d : DEFAULT_RETRY_OPTIONS.maxRetryDelayInMs;
    const secondaryHost = (_e = options.secondaryHost) !== null && _e !== void 0 ? _e : DEFAULT_RETRY_OPTIONS.secondaryHost;
    const tryTimeoutInMs = (_f = options.tryTimeoutInMs) !== null && _f !== void 0 ? _f : DEFAULT_RETRY_OPTIONS.tryTimeoutInMs;
    function shouldRetry({ isPrimaryRetry, attempt, response, error, }) {
        var _a, _b;
        if (attempt >= maxTries) {
            logger.info(`RetryPolicy: Attempt(s) ${attempt} >= maxTries ${maxTries}, no further try.`);
            return false;
        }
        if (error) {
            for (const retriableError of retriableErrors) {
                if (error.name.toUpperCase().includes(retriableError) ||
                    error.message.toUpperCase().includes(retriableError) ||
                    (error.code && error.code.toString().toUpperCase() === retriableError)) {
                    logger.info(`RetryPolicy: Network error ${retriableError} found, will retry.`);
                    return true;
                }
            }
            if ((error === null || error === void 0 ? void 0 : error.code) === "PARSE_ERROR" &&
                (error === null || error === void 0 ? void 0 : error.message.startsWith(`Error "Error: Unclosed root tag`))) {
                logger.info("RetryPolicy: Incomplete XML response likely due to service timeout, will retry.");
                return true;
            }
        }
        // If attempt was against the secondary & it returned a StatusNotFound (404), then
        // the resource was not found. This may be due to replication delay. So, in this
        // case, we'll never try the secondary again for this operation.
        if (response || error) {
            const statusCode = (_b = (_a = response === null || response === void 0 ? void 0 : response.status) !== null && _a !== void 0 ? _a : error === null || error === void 0 ? void 0 : error.statusCode) !== null && _b !== void 0 ? _b : 0;
            if (!isPrimaryRetry && statusCode === 404) {
                logger.info(`RetryPolicy: Secondary access with 404, will retry.`);
                return true;
            }
            // Server internal error or server timeout
            if (statusCode === 503 || statusCode === 500) {
                logger.info(`RetryPolicy: Will retry for status code ${statusCode}.`);
                return true;
            }
        }
        // [Copy source error code] Feature is pending on service side, skip retry on copy source error for now.
        // if (response) {
        //   // Retry select Copy Source Error Codes.
        //   if (response?.status >= 400) {
        //     const copySourceError = response.headers.get(HeaderConstants.X_MS_CopySourceErrorCode);
        //     if (copySourceError !== undefined) {
        //       switch (copySourceError) {
        //         case "InternalError":
        //         case "OperationTimedOut":
        //         case "ServerBusy":
        //           return true;
        //       }
        //     }
        //   }
        // }
        return false;
    }
    function calculateDelay(isPrimaryRetry, attempt) {
        let delayTimeInMs = 0;
        if (isPrimaryRetry) {
            switch (retryPolicyType) {
                case StorageRetryPolicyType.EXPONENTIAL:
                    delayTimeInMs = Math.min((Math.pow(2, attempt - 1) - 1) * retryDelayInMs, maxRetryDelayInMs);
                    break;
                case StorageRetryPolicyType.FIXED:
                    delayTimeInMs = retryDelayInMs;
                    break;
            }
        }
        else {
            delayTimeInMs = Math.random() * 1000;
        }
        logger.info(`RetryPolicy: Delay for ${delayTimeInMs}ms`);
        return delayTimeInMs;
    }
    return {
        name: storageRetryPolicyName,
        async sendRequest(request, next) {
            // Set the server-side timeout query parameter "timeout=[seconds]"
            if (tryTimeoutInMs) {
                request.url = setURLParameter(request.url, URLConstants.Parameters.TIMEOUT, String(Math.floor(tryTimeoutInMs / 1000)));
            }
            const primaryUrl = request.url;
            const secondaryUrl = secondaryHost ? setURLHost(request.url, secondaryHost) : undefined;
            let secondaryHas404 = false;
            let attempt = 1;
            let retryAgain = true;
            let response;
            let error;
            while (retryAgain) {
                const isPrimaryRetry = secondaryHas404 ||
                    !secondaryUrl ||
                    !["GET", "HEAD", "OPTIONS"].includes(request.method) ||
                    attempt % 2 === 1;
                request.url = isPrimaryRetry ? primaryUrl : secondaryUrl;
                response = undefined;
                error = undefined;
                try {
                    logger.info(`RetryPolicy: =====> Try=${attempt} ${isPrimaryRetry ? "Primary" : "Secondary"}`);
                    response = await next(request);
                    secondaryHas404 = secondaryHas404 || (!isPrimaryRetry && response.status === 404);
                }
                catch (e) {
                    if (isRestError(e)) {
                        logger.error(`RetryPolicy: Caught error, message: ${e.message}, code: ${e.code}`);
                        error = e;
                    }
                    else {
                        logger.error(`RetryPolicy: Caught error, message: ${getErrorMessage(e)}`);
                        throw e;
                    }
                }
                retryAgain = shouldRetry({ isPrimaryRetry, attempt, response, error });
                if (retryAgain) {
                    await delay(calculateDelay(isPrimaryRetry, attempt), request.abortSignal, RETRY_ABORT_ERROR);
                }
                attempt++;
            }
            if (response) {
                return response;
            }
            throw error !== null && error !== void 0 ? error : new RestError("RetryPolicy failed without known error.");
        },
    };
}
//# sourceMappingURL=StorageRetryPolicyV2.js.map