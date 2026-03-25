/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UserAttribute } from "../network_client/custom_auth_api/types/ApiErrorResponseTypes.js";
import { CustomAuthError } from "./CustomAuthError.js";

/**
 * Error when no required authentication method by Microsoft Entra is supported
 */
export class RedirectError extends CustomAuthError {
    constructor(correlationId?: string, public redirectReason?: string) {
        super(
            "redirect",
            redirectReason ||
                "Redirect Error, a fallback to the browser-delegated authentication is needed. Use loginPopup instead.",
            correlationId
        );
        Object.setPrototypeOf(this, RedirectError.prototype);
    }
}

/**
 * Custom Auth API error.
 */
export class CustomAuthApiError extends CustomAuthError {
    constructor(
        error: string,
        errorDescription: string,
        correlationId?: string,
        errorCodes?: Array<number>,
        subError?: string,
        public attributes?: Array<UserAttribute>,
        public continuationToken?: string,
        public traceId?: string,
        public timestamp?: string
    ) {
        super(error, errorDescription, correlationId, errorCodes, subError);
        Object.setPrototypeOf(this, CustomAuthApiError.prototype);
    }
}
