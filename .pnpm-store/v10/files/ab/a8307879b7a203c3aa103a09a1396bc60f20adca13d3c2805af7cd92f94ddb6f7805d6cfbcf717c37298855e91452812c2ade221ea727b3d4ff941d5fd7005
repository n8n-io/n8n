/*! @azure/msal-browser v4.27.0 2025-12-04 */
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
