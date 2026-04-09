/*! @azure/msal-browser v4.30.0 2026-03-18 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthError extends Error {
    constructor(error, errorDescription, correlationId, errorCodes, subError) {
        super(`${error}: ${errorDescription ?? ""}`);
        this.error = error;
        this.errorDescription = errorDescription;
        this.correlationId = correlationId;
        this.errorCodes = errorCodes;
        this.subError = subError;
        Object.setPrototypeOf(this, CustomAuthError.prototype);
        this.errorCodes = errorCodes ?? [];
        this.subError = subError ?? "";
    }
}

export { CustomAuthError };
//# sourceMappingURL=CustomAuthError.mjs.map
