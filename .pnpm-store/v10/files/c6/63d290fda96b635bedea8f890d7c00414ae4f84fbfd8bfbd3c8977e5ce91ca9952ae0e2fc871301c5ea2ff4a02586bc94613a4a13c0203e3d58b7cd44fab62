/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { InvalidArgumentError } from '../error/InvalidArgumentError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function ensureArgumentIsNotNullOrUndefined(argName, argValue, correlationId) {
    if (argValue === null || argValue === undefined) {
        throw new InvalidArgumentError(argName, correlationId);
    }
}
function ensureArgumentIsNotEmptyString(argName, argValue, correlationId) {
    if (!argValue || argValue.trim() === "") {
        throw new InvalidArgumentError(argName, correlationId);
    }
}
function ensureArgumentIsJSONString(argName, argValue, correlationId) {
    try {
        const parsed = JSON.parse(argValue);
        if (typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)) {
            throw new InvalidArgumentError(argName, correlationId);
        }
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            throw new InvalidArgumentError(argName, correlationId);
        }
        throw e; // Rethrow unexpected errors
    }
}

export { ensureArgumentIsJSONString, ensureArgumentIsNotEmptyString, ensureArgumentIsNotNullOrUndefined };
//# sourceMappingURL=ArgumentValidator.mjs.map
