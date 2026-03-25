/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthError } from '@azure/msal-common/browser';
import { timedOut, failedToDecryptEarResponse, failedToParseHeaders, failedToBuildHeaders, invalidPopTokenRequest, invalidBase64String, nativePromptNotSupported, uninitializedPublicClientApplication, nativeConnectionNotEstablished, nativeExtensionNotInstalled, nativeHandshakeTimeout, unableToAcquireTokenFromNativePlatform, databaseUnavailable, spaCodeAndNativeAccountIdPresent, authCodeOrNativeAccountIdRequired, authCodeRequired, cryptoKeyNotFound, unableToLoadToken, failedToParseResponse, getRequestFailed, postRequestFailed, noNetworkConnectivity, databaseNotOpen, nonBrowserEnvironment, invalidCacheType, authRequestNotSetError, unableToParseTokenRequestCacheError, noTokenRequestCacheError, silentPromptValueError, noAccountError, silentLogoutUnsupported, iframeClosedPrematurely, blockNestedPopups, blockIframeReload, redirectInIframe, monitorWindowTimeout, monitorPopupTimeout, userCancelled, emptyWindowError, popupWindowError, interactionInProgress, stateInteractionTypeMismatch, unableToParseState, hashDoesNotContainKnownProperties, noStateInHash, hashEmptyError, emptyNavigateUri, cryptoNonExistent, earJweEmpty, earJwkEmpty, pkceNotCreated } from './BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ErrorLink = "For more visit: aka.ms/msaljs/browser-errors";
/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 */
const BrowserAuthErrorMessages = {
    [pkceNotCreated]: "The PKCE code challenge and verifier could not be generated.",
    [earJwkEmpty]: "No EAR encryption key provided. This is unexpected.",
    [earJweEmpty]: "Server response does not contain ear_jwe property. This is unexpected.",
    [cryptoNonExistent]: "The crypto object or function is not available.",
    [emptyNavigateUri]: "Navigation URI is empty. Please check stack trace for more info.",
    [hashEmptyError]: `Hash value cannot be processed because it is empty. Please verify that your redirectUri is not clearing the hash. ${ErrorLink}`,
    [noStateInHash]: "Hash does not contain state. Please verify that the request originated from msal.",
    [hashDoesNotContainKnownProperties]: `Hash does not contain known properites. Please verify that your redirectUri is not changing the hash.  ${ErrorLink}`,
    [unableToParseState]: "Unable to parse state. Please verify that the request originated from msal.",
    [stateInteractionTypeMismatch]: "Hash contains state but the interaction type does not match the caller.",
    [interactionInProgress]: `Interaction is currently in progress. Please ensure that this interaction has been completed before calling an interactive API.   ${ErrorLink}`,
    [popupWindowError]: "Error opening popup window. This can happen if you are using IE or if popups are blocked in the browser.",
    [emptyWindowError]: "window.open returned null or undefined window object.",
    [userCancelled]: "User cancelled the flow.",
    [monitorPopupTimeout]: `Token acquisition in popup failed due to timeout.  ${ErrorLink}`,
    [monitorWindowTimeout]: `Token acquisition in iframe failed due to timeout.  ${ErrorLink}`,
    [redirectInIframe]: "Redirects are not supported for iframed or brokered applications. Please ensure you are using MSAL.js in a top frame of the window if using the redirect APIs, or use the popup APIs.",
    [blockIframeReload]: `Request was blocked inside an iframe because MSAL detected an authentication response.  ${ErrorLink}`,
    [blockNestedPopups]: "Request was blocked inside a popup because MSAL detected it was running in a popup.",
    [iframeClosedPrematurely]: "The iframe being monitored was closed prematurely.",
    [silentLogoutUnsupported]: "Silent logout not supported. Please call logoutRedirect or logoutPopup instead.",
    [noAccountError]: "No account object provided to acquireTokenSilent and no active account has been set. Please call setActiveAccount or provide an account on the request.",
    [silentPromptValueError]: "The value given for the prompt value is not valid for silent requests - must be set to 'none' or 'no_session'.",
    [noTokenRequestCacheError]: "No token request found in cache.",
    [unableToParseTokenRequestCacheError]: "The cached token request could not be parsed.",
    [authRequestNotSetError]: "Auth Request not set. Please ensure initiateAuthRequest was called from the InteractionHandler",
    [invalidCacheType]: "Invalid cache type",
    [nonBrowserEnvironment]: "Login and token requests are not supported in non-browser environments.",
    [databaseNotOpen]: "Database is not open!",
    [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
    [postRequestFailed]: "Network request failed: If the browser threw a CORS error, check that the redirectUri is registered in the Azure App Portal as type 'SPA'",
    [getRequestFailed]: "Network request failed. Please check the network trace to determine root cause.",
    [failedToParseResponse]: "Failed to parse network response. Check network trace.",
    [unableToLoadToken]: "Error loading token to cache.",
    [cryptoKeyNotFound]: "Cryptographic Key or Keypair not found in browser storage.",
    [authCodeRequired]: "An authorization code must be provided (as the `code` property on the request) to this flow.",
    [authCodeOrNativeAccountIdRequired]: "An authorization code or nativeAccountId must be provided to this flow.",
    [spaCodeAndNativeAccountIdPresent]: "Request cannot contain both spa code and native account id.",
    [databaseUnavailable]: "IndexedDB, which is required for persistent cryptographic key storage, is unavailable. This may be caused by browser privacy features which block persistent storage in third-party contexts.",
    [unableToAcquireTokenFromNativePlatform]: `Unable to acquire token from native platform.  ${ErrorLink}`,
    [nativeHandshakeTimeout]: "Timed out while attempting to establish connection to browser extension",
    [nativeExtensionNotInstalled]: "Native extension is not installed. If you think this is a mistake call the initialize function.",
    [nativeConnectionNotEstablished]: `Connection to native platform has not been established. Please install a compatible browser extension and run initialize().  ${ErrorLink}`,
    [uninitializedPublicClientApplication]: `You must call and await the initialize function before attempting to call any other MSAL API.  ${ErrorLink}`,
    [nativePromptNotSupported]: "The provided prompt is not supported by the native platform. This request should be routed to the web based flow.",
    [invalidBase64String]: "Invalid base64 encoded string.",
    [invalidPopTokenRequest]: "Invalid PoP token request. The request should not have both a popKid value and signPopToken set to true.",
    [failedToBuildHeaders]: "Failed to build request headers object.",
    [failedToParseHeaders]: "Failed to parse response headers",
    [failedToDecryptEarResponse]: "Failed to decrypt ear response",
    [timedOut]: "The request timed out.",
};
/**
 * Browser library error class thrown by the MSAL.js library for SPAs
 */
class BrowserAuthError extends AuthError {
    constructor(errorCode, subError) {
        super(errorCode, BrowserAuthErrorMessages[errorCode], subError);
        Object.setPrototypeOf(this, BrowserAuthError.prototype);
        this.name = "BrowserAuthError";
    }
}
function createBrowserAuthError(errorCode, subError) {
    return new BrowserAuthError(errorCode, subError);
}

export { BrowserAuthError, BrowserAuthErrorMessages, createBrowserAuthError };
//# sourceMappingURL=BrowserAuthError.mjs.map
