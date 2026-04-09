/*! @azure/msal-browser v4.30.0 2026-03-18 */
'use strict';
import { CustomAuthError } from './CustomAuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class MsalCustomAuthError extends CustomAuthError {
    constructor(error, errorDescription, subError, errorCodes, correlationId) {
        super(error, errorDescription, correlationId, errorCodes, subError);
        Object.setPrototypeOf(this, MsalCustomAuthError.prototype);
    }
}

export { MsalCustomAuthError };
//# sourceMappingURL=MsalCustomAuthError.mjs.map
