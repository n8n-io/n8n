/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthError } from './CustomAuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Error when no required authentication method by Microsoft Entra is supported
 */
class RedirectError extends CustomAuthError {
    constructor(correlationId, redirectReason) {
        super("redirect", redirectReason ||
            "Redirect Error, a fallback to the browser-delegated authentication is needed. Use loginPopup instead.", correlationId);
        this.redirectReason = redirectReason;
        Object.setPrototypeOf(this, RedirectError.prototype);
    }
}
/**
 * Custom Auth API error.
 */
class CustomAuthApiError extends CustomAuthError {
    constructor(error, errorDescription, correlationId, errorCodes, subError, attributes, continuationToken, traceId, timestamp) {
        super(error, errorDescription, correlationId, errorCodes, subError);
        this.attributes = attributes;
        this.continuationToken = continuationToken;
        this.traceId = traceId;
        this.timestamp = timestamp;
        Object.setPrototypeOf(this, CustomAuthApiError.prototype);
    }
}

export { CustomAuthApiError, RedirectError };
//# sourceMappingURL=CustomAuthApiError.mjs.map
