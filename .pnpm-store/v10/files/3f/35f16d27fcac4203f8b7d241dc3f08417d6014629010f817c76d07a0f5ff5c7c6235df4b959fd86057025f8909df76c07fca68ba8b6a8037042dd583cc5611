/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthError, createInteractionRequiredAuthError, InteractionRequiredAuthErrorCodes, InteractionRequiredAuthError } from '@azure/msal-common/browser';
import { createBrowserAuthError } from './BrowserAuthError.mjs';
import { pageException, contentError, userSwitch } from './NativeAuthErrorCodes.mjs';
import { DISABLED, UX_NOT_ALLOWED, NO_NETWORK, USER_CANCEL, USER_INTERACTION_REQUIRED, ACCOUNT_UNAVAILABLE } from '../broker/nativeBroker/NativeStatusCodes.mjs';
import { noNetworkConnectivity, userCancelled } from './BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const INVALID_METHOD_ERROR = -2147186943;
const NativeAuthErrorMessages = {
    [userSwitch]: "User attempted to switch accounts in the native broker, which is not allowed. All new accounts must sign-in through the standard web flow first, please try again.",
};
class NativeAuthError extends AuthError {
    constructor(errorCode, description, ext) {
        super(errorCode, description);
        Object.setPrototypeOf(this, NativeAuthError.prototype);
        this.name = "NativeAuthError";
        this.ext = ext;
    }
}
/**
 * These errors should result in a fallback to the 'standard' browser based auth flow.
 */
function isFatalNativeAuthError(error) {
    if (error.ext &&
        error.ext.status &&
        error.ext.status === DISABLED) {
        return true;
    }
    if (error.ext &&
        error.ext.error &&
        error.ext.error === INVALID_METHOD_ERROR) {
        return true;
    }
    switch (error.errorCode) {
        case contentError:
        case pageException:
            return true;
        default:
            return false;
    }
}
/**
 * Create the appropriate error object based on the WAM status code.
 * @param code
 * @param description
 * @param ext
 * @returns
 */
function createNativeAuthError(code, description, ext) {
    if (ext && ext.status) {
        switch (ext.status) {
            case ACCOUNT_UNAVAILABLE:
                return createInteractionRequiredAuthError(InteractionRequiredAuthErrorCodes.nativeAccountUnavailable);
            case USER_INTERACTION_REQUIRED:
                return new InteractionRequiredAuthError(code, description);
            case USER_CANCEL:
                return createBrowserAuthError(userCancelled);
            case NO_NETWORK:
                return createBrowserAuthError(noNetworkConnectivity);
            case UX_NOT_ALLOWED:
                return createInteractionRequiredAuthError(InteractionRequiredAuthErrorCodes.uxNotAllowed);
        }
    }
    return new NativeAuthError(code, NativeAuthErrorMessages[code] || description, ext);
}

export { NativeAuthError, NativeAuthErrorMessages, createNativeAuthError, isFatalNativeAuthError };
//# sourceMappingURL=NativeAuthError.mjs.map
