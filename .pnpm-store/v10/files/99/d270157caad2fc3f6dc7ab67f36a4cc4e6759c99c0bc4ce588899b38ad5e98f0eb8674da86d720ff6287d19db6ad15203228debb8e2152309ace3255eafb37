/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { Constants } from '../utils/Constants.mjs';
import { postRequestFailed, unexpectedError } from './AuthErrorCodes.mjs';
import * as AuthErrorCodes from './AuthErrorCodes.mjs';
export { AuthErrorCodes };

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const AuthErrorMessages = {
    [unexpectedError]: "Unexpected error in authentication.",
    [postRequestFailed]: "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details.",
};
/**
 * AuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use AuthErrorCodes instead
 */
const AuthErrorMessage = {
    unexpectedError: {
        code: unexpectedError,
        desc: AuthErrorMessages[unexpectedError],
    },
    postRequestFailed: {
        code: postRequestFailed,
        desc: AuthErrorMessages[postRequestFailed],
    },
};
/**
 * General error class thrown by the MSAL.js library.
 */
class AuthError extends Error {
    constructor(errorCode, errorMessage, suberror) {
        const errorString = errorMessage
            ? `${errorCode}: ${errorMessage}`
            : errorCode;
        super(errorString);
        Object.setPrototypeOf(this, AuthError.prototype);
        this.errorCode = errorCode || Constants.EMPTY_STRING;
        this.errorMessage = errorMessage || Constants.EMPTY_STRING;
        this.subError = suberror || Constants.EMPTY_STRING;
        this.name = "AuthError";
    }
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
}
function createAuthError(code, additionalMessage) {
    return new AuthError(code, additionalMessage
        ? `${AuthErrorMessages[code]} ${additionalMessage}`
        : AuthErrorMessages[code]);
}

export { AuthError, AuthErrorMessage, AuthErrorMessages, createAuthError };
//# sourceMappingURL=AuthError.mjs.map
