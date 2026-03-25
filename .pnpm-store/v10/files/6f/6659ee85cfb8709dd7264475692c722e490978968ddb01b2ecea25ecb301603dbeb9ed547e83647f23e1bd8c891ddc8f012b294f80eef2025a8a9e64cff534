/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthError } from './CustomAuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class UnexpectedError extends CustomAuthError {
    constructor(errorData, correlationId) {
        let errorDescription;
        if (errorData instanceof Error) {
            errorDescription = errorData.message;
        }
        else if (typeof errorData === "string") {
            errorDescription = errorData;
        }
        else if (typeof errorData === "object" && errorData !== null) {
            errorDescription = JSON.stringify(errorData);
        }
        else {
            errorDescription = "An unexpected error occurred.";
        }
        super("unexpected_error", errorDescription, correlationId);
        Object.setPrototypeOf(this, UnexpectedError.prototype);
    }
}

export { UnexpectedError };
//# sourceMappingURL=UnexpectedError.mjs.map
