/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { AuthError } from './AuthError.mjs';
import { cacheErrorUnknown, cacheQuotaExceeded } from './CacheErrorCodes.mjs';
import * as CacheErrorCodes from './CacheErrorCodes.mjs';
export { CacheErrorCodes };

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CacheErrorMessages = {
    [cacheQuotaExceeded]: "Exceeded cache storage capacity.",
    [cacheErrorUnknown]: "Unexpected error occurred when using cache storage.",
};
/**
 * Error thrown when there is an error with the cache
 */
class CacheError extends AuthError {
    constructor(errorCode, errorMessage) {
        const message = errorMessage ||
            (CacheErrorMessages[errorCode]
                ? CacheErrorMessages[errorCode]
                : CacheErrorMessages[cacheErrorUnknown]);
        super(`${errorCode}: ${message}`);
        Object.setPrototypeOf(this, CacheError.prototype);
        this.name = "CacheError";
        this.errorCode = errorCode;
        this.errorMessage = message;
    }
}
/**
 * Helper function to wrap browser errors in a CacheError object
 * @param e
 * @returns
 */
function createCacheError(e) {
    if (!(e instanceof Error)) {
        return new CacheError(cacheErrorUnknown);
    }
    if (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        e.message.includes("exceeded the quota")) {
        return new CacheError(cacheQuotaExceeded);
    }
    else {
        return new CacheError(e.name, e.message);
    }
}

export { CacheError, CacheErrorMessages, createCacheError };
//# sourceMappingURL=CacheError.mjs.map
