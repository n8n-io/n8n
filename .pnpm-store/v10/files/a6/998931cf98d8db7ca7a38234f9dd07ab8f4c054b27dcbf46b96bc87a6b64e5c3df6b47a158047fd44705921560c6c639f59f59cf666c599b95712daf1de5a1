/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Constants } from "../utils/Constants.js";
import { AuthError } from "./AuthError.js";
import * as InteractionRequiredAuthErrorCodes from "./InteractionRequiredAuthErrorCodes.js";
export { InteractionRequiredAuthErrorCodes };

/**
 * InteractionRequiredServerErrorMessage contains string constants used by error codes and messages returned by the server indicating interaction is required
 */
export const InteractionRequiredServerErrorMessage = [
    InteractionRequiredAuthErrorCodes.interactionRequired,
    InteractionRequiredAuthErrorCodes.consentRequired,
    InteractionRequiredAuthErrorCodes.loginRequired,
    InteractionRequiredAuthErrorCodes.badToken,
    InteractionRequiredAuthErrorCodes.uxNotAllowed,
];

export const InteractionRequiredAuthSubErrorMessage = [
    "message_only",
    "additional_action",
    "basic_action",
    "user_password_expired",
    "consent_required",
    "bad_token",
];

const InteractionRequiredAuthErrorMessages = {
    [InteractionRequiredAuthErrorCodes.noTokensFound]:
        "No refresh token found in the cache. Please sign-in.",
    [InteractionRequiredAuthErrorCodes.nativeAccountUnavailable]:
        "The requested account is not available in the native broker. It may have been deleted or logged out. Please sign-in again using an interactive API.",
    [InteractionRequiredAuthErrorCodes.refreshTokenExpired]:
        "Refresh token has expired.",
    [InteractionRequiredAuthErrorCodes.badToken]:
        "Identity provider returned bad_token due to an expired or invalid refresh token. Please invoke an interactive API to resolve.",
    [InteractionRequiredAuthErrorCodes.uxNotAllowed]:
        "`canShowUI` flag in Edge was set to false. User interaction required on web page. Please invoke an interactive API to resolve.",
};

/**
 * Interaction required errors defined by the SDK
 * @deprecated Use InteractionRequiredAuthErrorCodes instead
 */
export const InteractionRequiredAuthErrorMessage = {
    noTokensFoundError: {
        code: InteractionRequiredAuthErrorCodes.noTokensFound,
        desc: InteractionRequiredAuthErrorMessages[
            InteractionRequiredAuthErrorCodes.noTokensFound
        ],
    },
    native_account_unavailable: {
        code: InteractionRequiredAuthErrorCodes.nativeAccountUnavailable,
        desc: InteractionRequiredAuthErrorMessages[
            InteractionRequiredAuthErrorCodes.nativeAccountUnavailable
        ],
    },
    bad_token: {
        code: InteractionRequiredAuthErrorCodes.badToken,
        desc: InteractionRequiredAuthErrorMessages[
            InteractionRequiredAuthErrorCodes.badToken
        ],
    },
};

/**
 * Error thrown when user interaction is required.
 */
export class InteractionRequiredAuthError extends AuthError {
    /**
     * The time the error occured at
     */
    timestamp: string;

    /**
     * TraceId associated with the error
     */
    traceId: string;

    /**
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/claims-challenge.md
     *
     * A string with extra claims needed for the token request to succeed
     * web site: redirect the user to the authorization page and set the extra claims
     * web api: include the claims in the WWW-Authenticate header that are sent back to the client so that it knows to request a token with the extra claims
     * desktop application or browser context: include the claims when acquiring the token interactively
     * app to app context (client_credentials): include the claims in the AcquireTokenByClientCredential request
     */
    claims: string;

    /**
     * Server error number;
     */
    readonly errorNo?: string;

    constructor(
        errorCode?: string,
        errorMessage?: string,
        subError?: string,
        timestamp?: string,
        traceId?: string,
        correlationId?: string,
        claims?: string,
        errorNo?: string
    ) {
        super(errorCode, errorMessage, subError);
        Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype);

        this.timestamp = timestamp || Constants.EMPTY_STRING;
        this.traceId = traceId || Constants.EMPTY_STRING;
        this.correlationId = correlationId || Constants.EMPTY_STRING;
        this.claims = claims || Constants.EMPTY_STRING;
        this.name = "InteractionRequiredAuthError";
        this.errorNo = errorNo;
    }
}

/**
 * Helper function used to determine if an error thrown by the server requires interaction to resolve
 * @param errorCode
 * @param errorString
 * @param subError
 */
export function isInteractionRequiredError(
    errorCode?: string,
    errorString?: string,
    subError?: string
): boolean {
    const isInteractionRequiredErrorCode =
        !!errorCode &&
        InteractionRequiredServerErrorMessage.indexOf(errorCode) > -1;
    const isInteractionRequiredSubError =
        !!subError &&
        InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
    const isInteractionRequiredErrorDesc =
        !!errorString &&
        InteractionRequiredServerErrorMessage.some((irErrorCode) => {
            return errorString.indexOf(irErrorCode) > -1;
        });

    return (
        isInteractionRequiredErrorCode ||
        isInteractionRequiredErrorDesc ||
        isInteractionRequiredSubError
    );
}

/**
 * Creates an InteractionRequiredAuthError
 */
export function createInteractionRequiredAuthError(
    errorCode: string
): InteractionRequiredAuthError {
    return new InteractionRequiredAuthError(
        errorCode,
        InteractionRequiredAuthErrorMessages[errorCode]
    );
}
