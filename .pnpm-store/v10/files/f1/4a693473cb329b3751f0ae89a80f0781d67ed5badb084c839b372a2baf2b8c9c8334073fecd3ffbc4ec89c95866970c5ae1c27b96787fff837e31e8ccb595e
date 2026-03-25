/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthError,
    InteractionRequiredAuthError,
    InteractionRequiredAuthErrorCodes,
    createInteractionRequiredAuthError,
} from "@azure/msal-common/browser";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "./BrowserAuthError.js";

import * as NativeAuthErrorCodes from "./NativeAuthErrorCodes.js";
import * as NativeStatusCodes from "../broker/nativeBroker/NativeStatusCodes.js";
export { NativeAuthErrorCodes };

export type OSError = {
    error?: number;
    protocol_error?: string;
    properties?: object;
    status?: string;
    retryable?: boolean;
};

const INVALID_METHOD_ERROR = -2147186943;

export const NativeAuthErrorMessages = {
    [NativeAuthErrorCodes.userSwitch]:
        "User attempted to switch accounts in the native broker, which is not allowed. All new accounts must sign-in through the standard web flow first, please try again.",
};

export class NativeAuthError extends AuthError {
    ext: OSError | undefined;

    constructor(errorCode: string, description?: string, ext?: OSError) {
        super(errorCode, description);

        Object.setPrototypeOf(this, NativeAuthError.prototype);
        this.name = "NativeAuthError";
        this.ext = ext;
    }
}

/**
 * These errors should result in a fallback to the 'standard' browser based auth flow.
 */
export function isFatalNativeAuthError(error: NativeAuthError): boolean {
    if (
        error.ext &&
        error.ext.status &&
        error.ext.status === NativeStatusCodes.DISABLED
    ) {
        return true;
    }

    if (
        error.ext &&
        error.ext.error &&
        error.ext.error === INVALID_METHOD_ERROR
    ) {
        return true;
    }

    switch (error.errorCode) {
        case NativeAuthErrorCodes.contentError:
        case NativeAuthErrorCodes.pageException:
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
export function createNativeAuthError(
    code: string,
    description?: string,
    ext?: OSError
): AuthError {
    if (ext && ext.status) {
        switch (ext.status) {
            case NativeStatusCodes.ACCOUNT_UNAVAILABLE:
                return createInteractionRequiredAuthError(
                    InteractionRequiredAuthErrorCodes.nativeAccountUnavailable
                );
            case NativeStatusCodes.USER_INTERACTION_REQUIRED:
                return new InteractionRequiredAuthError(code, description);
            case NativeStatusCodes.USER_CANCEL:
                return createBrowserAuthError(
                    BrowserAuthErrorCodes.userCancelled
                );
            case NativeStatusCodes.NO_NETWORK:
                return createBrowserAuthError(
                    BrowserAuthErrorCodes.noNetworkConnectivity
                );
            case NativeStatusCodes.UX_NOT_ALLOWED:
                return createInteractionRequiredAuthError(
                    InteractionRequiredAuthErrorCodes.uxNotAllowed
                );
        }
    }

    return new NativeAuthError(
        code,
        NativeAuthErrorMessages[code] || description,
        ext
    );
}
