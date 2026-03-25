/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthError } from './CustomAuthError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class InvalidArgumentError extends CustomAuthError {
    constructor(argName, correlationId) {
        const errorDescription = `The argument '${argName}' is invalid.`;
        super("invalid_argument", errorDescription, correlationId);
        Object.setPrototypeOf(this, InvalidArgumentError.prototype);
    }
}

export { InvalidArgumentError };
//# sourceMappingURL=InvalidArgumentError.mjs.map
