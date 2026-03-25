/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "@azure/msal-common/browser";
import * as BrowserAuthErrorCodes from "./BrowserAuthErrorCodes.js";
export { BrowserAuthErrorCodes }; // Allow importing as "BrowserAuthErrorCodes"

const ErrorLink = "For more visit: aka.ms/msaljs/browser-errors";

/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 */
export const BrowserAuthErrorMessages = {
    [BrowserAuthErrorCodes.pkceNotCreated]:
        "The PKCE code challenge and verifier could not be generated.",
    [BrowserAuthErrorCodes.earJwkEmpty]:
        "No EAR encryption key provided. This is unexpected.",
    [BrowserAuthErrorCodes.earJweEmpty]:
        "Server response does not contain ear_jwe property. This is unexpected.",
    [BrowserAuthErrorCodes.cryptoNonExistent]:
        "The crypto object or function is not available.",
    [BrowserAuthErrorCodes.emptyNavigateUri]:
        "Navigation URI is empty. Please check stack trace for more info.",
    [BrowserAuthErrorCodes.hashEmptyError]: `Hash value cannot be processed because it is empty. Please verify that your redirectUri is not clearing the hash. ${ErrorLink}`,
    [BrowserAuthErrorCodes.noStateInHash]:
        "Hash does not contain state. Please verify that the request originated from msal.",
    [BrowserAuthErrorCodes.hashDoesNotContainKnownProperties]: `Hash does not contain known properites. Please verify that your redirectUri is not changing the hash.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.unableToParseState]:
        "Unable to parse state. Please verify that the request originated from msal.",
    [BrowserAuthErrorCodes.stateInteractionTypeMismatch]:
        "Hash contains state but the interaction type does not match the caller.",
    [BrowserAuthErrorCodes.interactionInProgress]: `Interaction is currently in progress. Please ensure that this interaction has been completed before calling an interactive API.   ${ErrorLink}`,
    [BrowserAuthErrorCodes.popupWindowError]:
        "Error opening popup window. This can happen if you are using IE or if popups are blocked in the browser.",
    [BrowserAuthErrorCodes.emptyWindowError]:
        "window.open returned null or undefined window object.",
    [BrowserAuthErrorCodes.userCancelled]: "User cancelled the flow.",
    [BrowserAuthErrorCodes.monitorPopupTimeout]: `Token acquisition in popup failed due to timeout.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.monitorWindowTimeout]: `Token acquisition in iframe failed due to timeout.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.redirectInIframe]:
        "Redirects are not supported for iframed or brokered applications. Please ensure you are using MSAL.js in a top frame of the window if using the redirect APIs, or use the popup APIs.",
    [BrowserAuthErrorCodes.blockIframeReload]: `Request was blocked inside an iframe because MSAL detected an authentication response.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.blockNestedPopups]:
        "Request was blocked inside a popup because MSAL detected it was running in a popup.",
    [BrowserAuthErrorCodes.iframeClosedPrematurely]:
        "The iframe being monitored was closed prematurely.",
    [BrowserAuthErrorCodes.silentLogoutUnsupported]:
        "Silent logout not supported. Please call logoutRedirect or logoutPopup instead.",
    [BrowserAuthErrorCodes.noAccountError]:
        "No account object provided to acquireTokenSilent and no active account has been set. Please call setActiveAccount or provide an account on the request.",
    [BrowserAuthErrorCodes.silentPromptValueError]:
        "The value given for the prompt value is not valid for silent requests - must be set to 'none' or 'no_session'.",
    [BrowserAuthErrorCodes.noTokenRequestCacheError]:
        "No token request found in cache.",
    [BrowserAuthErrorCodes.unableToParseTokenRequestCacheError]:
        "The cached token request could not be parsed.",
    [BrowserAuthErrorCodes.authRequestNotSetError]:
        "Auth Request not set. Please ensure initiateAuthRequest was called from the InteractionHandler",
    [BrowserAuthErrorCodes.invalidCacheType]: "Invalid cache type",
    [BrowserAuthErrorCodes.nonBrowserEnvironment]:
        "Login and token requests are not supported in non-browser environments.",
    [BrowserAuthErrorCodes.databaseNotOpen]: "Database is not open!",
    [BrowserAuthErrorCodes.noNetworkConnectivity]:
        "No network connectivity. Check your internet connection.",
    [BrowserAuthErrorCodes.postRequestFailed]:
        "Network request failed: If the browser threw a CORS error, check that the redirectUri is registered in the Azure App Portal as type 'SPA'",
    [BrowserAuthErrorCodes.getRequestFailed]:
        "Network request failed. Please check the network trace to determine root cause.",
    [BrowserAuthErrorCodes.failedToParseResponse]:
        "Failed to parse network response. Check network trace.",
    [BrowserAuthErrorCodes.unableToLoadToken]: "Error loading token to cache.",
    [BrowserAuthErrorCodes.cryptoKeyNotFound]:
        "Cryptographic Key or Keypair not found in browser storage.",
    [BrowserAuthErrorCodes.authCodeRequired]:
        "An authorization code must be provided (as the `code` property on the request) to this flow.",
    [BrowserAuthErrorCodes.authCodeOrNativeAccountIdRequired]:
        "An authorization code or nativeAccountId must be provided to this flow.",
    [BrowserAuthErrorCodes.spaCodeAndNativeAccountIdPresent]:
        "Request cannot contain both spa code and native account id.",
    [BrowserAuthErrorCodes.databaseUnavailable]:
        "IndexedDB, which is required for persistent cryptographic key storage, is unavailable. This may be caused by browser privacy features which block persistent storage in third-party contexts.",
    [BrowserAuthErrorCodes.unableToAcquireTokenFromNativePlatform]: `Unable to acquire token from native platform.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.nativeHandshakeTimeout]:
        "Timed out while attempting to establish connection to browser extension",
    [BrowserAuthErrorCodes.nativeExtensionNotInstalled]:
        "Native extension is not installed. If you think this is a mistake call the initialize function.",
    [BrowserAuthErrorCodes.nativeConnectionNotEstablished]: `Connection to native platform has not been established. Please install a compatible browser extension and run initialize().  ${ErrorLink}`,
    [BrowserAuthErrorCodes.uninitializedPublicClientApplication]: `You must call and await the initialize function before attempting to call any other MSAL API.  ${ErrorLink}`,
    [BrowserAuthErrorCodes.nativePromptNotSupported]:
        "The provided prompt is not supported by the native platform. This request should be routed to the web based flow.",
    [BrowserAuthErrorCodes.invalidBase64String]:
        "Invalid base64 encoded string.",
    [BrowserAuthErrorCodes.invalidPopTokenRequest]:
        "Invalid PoP token request. The request should not have both a popKid value and signPopToken set to true.",
    [BrowserAuthErrorCodes.failedToBuildHeaders]:
        "Failed to build request headers object.",
    [BrowserAuthErrorCodes.failedToParseHeaders]:
        "Failed to parse response headers",
    [BrowserAuthErrorCodes.failedToDecryptEarResponse]:
        "Failed to decrypt ear response",
    [BrowserAuthErrorCodes.timedOut]: "The request timed out.",
};

/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use exported BrowserAuthErrorCodes instead.
 * In your app you can do :
 * ```
 * import { BrowserAuthErrorCodes } from "@azure/msal-browser";
 * ```
 */
export const BrowserAuthErrorMessage = {
    pkceNotGenerated: {
        code: BrowserAuthErrorCodes.pkceNotCreated,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.pkceNotCreated],
    },
    cryptoDoesNotExist: {
        code: BrowserAuthErrorCodes.cryptoNonExistent,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.cryptoNonExistent],
    },
    emptyNavigateUriError: {
        code: BrowserAuthErrorCodes.emptyNavigateUri,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.emptyNavigateUri],
    },
    hashEmptyError: {
        code: BrowserAuthErrorCodes.hashEmptyError,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.hashEmptyError],
    },
    hashDoesNotContainStateError: {
        code: BrowserAuthErrorCodes.noStateInHash,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.noStateInHash],
    },
    hashDoesNotContainKnownPropertiesError: {
        code: BrowserAuthErrorCodes.hashDoesNotContainKnownProperties,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.hashDoesNotContainKnownProperties
        ],
    },
    unableToParseStateError: {
        code: BrowserAuthErrorCodes.unableToParseState,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.unableToParseState
        ],
    },
    stateInteractionTypeMismatchError: {
        code: BrowserAuthErrorCodes.stateInteractionTypeMismatch,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.stateInteractionTypeMismatch
        ],
    },
    interactionInProgress: {
        code: BrowserAuthErrorCodes.interactionInProgress,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.interactionInProgress
        ],
    },
    popupWindowError: {
        code: BrowserAuthErrorCodes.popupWindowError,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.popupWindowError],
    },
    emptyWindowError: {
        code: BrowserAuthErrorCodes.emptyWindowError,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.emptyWindowError],
    },
    userCancelledError: {
        code: BrowserAuthErrorCodes.userCancelled,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.userCancelled],
    },
    monitorPopupTimeoutError: {
        code: BrowserAuthErrorCodes.monitorPopupTimeout,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.monitorPopupTimeout
        ],
    },
    monitorIframeTimeoutError: {
        code: BrowserAuthErrorCodes.monitorWindowTimeout,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.monitorWindowTimeout
        ],
    },
    redirectInIframeError: {
        code: BrowserAuthErrorCodes.redirectInIframe,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.redirectInIframe],
    },
    blockTokenRequestsInHiddenIframeError: {
        code: BrowserAuthErrorCodes.blockIframeReload,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.blockIframeReload],
    },
    blockAcquireTokenInPopupsError: {
        code: BrowserAuthErrorCodes.blockNestedPopups,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.blockNestedPopups],
    },
    iframeClosedPrematurelyError: {
        code: BrowserAuthErrorCodes.iframeClosedPrematurely,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.iframeClosedPrematurely
        ],
    },
    silentLogoutUnsupportedError: {
        code: BrowserAuthErrorCodes.silentLogoutUnsupported,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.silentLogoutUnsupported
        ],
    },
    noAccountError: {
        code: BrowserAuthErrorCodes.noAccountError,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.noAccountError],
    },
    silentPromptValueError: {
        code: BrowserAuthErrorCodes.silentPromptValueError,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.silentPromptValueError
        ],
    },
    noTokenRequestCacheError: {
        code: BrowserAuthErrorCodes.noTokenRequestCacheError,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.noTokenRequestCacheError
        ],
    },
    unableToParseTokenRequestCacheError: {
        code: BrowserAuthErrorCodes.unableToParseTokenRequestCacheError,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.unableToParseTokenRequestCacheError
        ],
    },
    authRequestNotSet: {
        code: BrowserAuthErrorCodes.authRequestNotSetError,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.authRequestNotSetError
        ],
    },
    invalidCacheType: {
        code: BrowserAuthErrorCodes.invalidCacheType,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.invalidCacheType],
    },
    notInBrowserEnvironment: {
        code: BrowserAuthErrorCodes.nonBrowserEnvironment,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.nonBrowserEnvironment
        ],
    },
    databaseNotOpen: {
        code: BrowserAuthErrorCodes.databaseNotOpen,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.databaseNotOpen],
    },
    noNetworkConnectivity: {
        code: BrowserAuthErrorCodes.noNetworkConnectivity,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.noNetworkConnectivity
        ],
    },
    postRequestFailed: {
        code: BrowserAuthErrorCodes.postRequestFailed,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.postRequestFailed],
    },
    getRequestFailed: {
        code: BrowserAuthErrorCodes.getRequestFailed,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.getRequestFailed],
    },
    failedToParseNetworkResponse: {
        code: BrowserAuthErrorCodes.failedToParseResponse,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.failedToParseResponse
        ],
    },
    unableToLoadTokenError: {
        code: BrowserAuthErrorCodes.unableToLoadToken,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.unableToLoadToken],
    },
    signingKeyNotFoundInStorage: {
        code: BrowserAuthErrorCodes.cryptoKeyNotFound,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.cryptoKeyNotFound],
    },
    authCodeRequired: {
        code: BrowserAuthErrorCodes.authCodeRequired,
        desc: BrowserAuthErrorMessages[BrowserAuthErrorCodes.authCodeRequired],
    },
    authCodeOrNativeAccountRequired: {
        code: BrowserAuthErrorCodes.authCodeOrNativeAccountIdRequired,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.authCodeOrNativeAccountIdRequired
        ],
    },
    spaCodeAndNativeAccountPresent: {
        code: BrowserAuthErrorCodes.spaCodeAndNativeAccountIdPresent,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.spaCodeAndNativeAccountIdPresent
        ],
    },
    databaseUnavailable: {
        code: BrowserAuthErrorCodes.databaseUnavailable,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.databaseUnavailable
        ],
    },
    unableToAcquireTokenFromNativePlatform: {
        code: BrowserAuthErrorCodes.unableToAcquireTokenFromNativePlatform,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.unableToAcquireTokenFromNativePlatform
        ],
    },
    nativeHandshakeTimeout: {
        code: BrowserAuthErrorCodes.nativeHandshakeTimeout,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.nativeHandshakeTimeout
        ],
    },
    nativeExtensionNotInstalled: {
        code: BrowserAuthErrorCodes.nativeExtensionNotInstalled,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.nativeExtensionNotInstalled
        ],
    },
    nativeConnectionNotEstablished: {
        code: BrowserAuthErrorCodes.nativeConnectionNotEstablished,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.nativeConnectionNotEstablished
        ],
    },
    uninitializedPublicClientApplication: {
        code: BrowserAuthErrorCodes.uninitializedPublicClientApplication,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.uninitializedPublicClientApplication
        ],
    },
    nativePromptNotSupported: {
        code: BrowserAuthErrorCodes.nativePromptNotSupported,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.nativePromptNotSupported
        ],
    },
    invalidBase64StringError: {
        code: BrowserAuthErrorCodes.invalidBase64String,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.invalidBase64String
        ],
    },
    invalidPopTokenRequest: {
        code: BrowserAuthErrorCodes.invalidPopTokenRequest,
        desc: BrowserAuthErrorMessages[
            BrowserAuthErrorCodes.invalidPopTokenRequest
        ],
    },
};

/**
 * Browser library error class thrown by the MSAL.js library for SPAs
 */
export class BrowserAuthError extends AuthError {
    constructor(errorCode: string, subError?: string) {
        super(errorCode, BrowserAuthErrorMessages[errorCode], subError);

        Object.setPrototypeOf(this, BrowserAuthError.prototype);
        this.name = "BrowserAuthError";
    }
}

export function createBrowserAuthError(
    errorCode: string,
    subError?: string
): BrowserAuthError {
    return new BrowserAuthError(errorCode, subError);
}
