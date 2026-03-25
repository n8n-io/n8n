/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { OIDC_DEFAULT_SCOPES } from '@azure/msal-common/browser';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Constants
 */
const BrowserConstants = {
    /**
     * Invalid grant error code
     */
    INVALID_GRANT_ERROR: "invalid_grant",
    /**
     * Default popup window width
     */
    POPUP_WIDTH: 483,
    /**
     * Default popup window height
     */
    POPUP_HEIGHT: 600,
    /**
     * Name of the popup window starts with
     */
    POPUP_NAME_PREFIX: "msal",
    /**
     * Default popup monitor poll interval in milliseconds
     */
    DEFAULT_POLL_INTERVAL_MS: 30,
    /**
     * Msal-browser SKU
     */
    MSAL_SKU: "msal.js.browser",
};
const PlatformAuthConstants = {
    CHANNEL_ID: "53ee284d-920a-4b59-9d30-a60315b26836",
    PREFERRED_EXTENSION_ID: "ppnbnpeolgkicgegkbkbjmhlideopiji",
    MATS_TELEMETRY: "MATS",
    MICROSOFT_ENTRA_BROKERID: "MicrosoftEntra",
    DOM_API_NAME: "DOM API",
    PLATFORM_DOM_APIS: "get-token-and-sign-out",
    PLATFORM_DOM_PROVIDER: "PlatformAuthDOMHandler",
    PLATFORM_EXTENSION_PROVIDER: "PlatformAuthExtensionHandler",
};
const NativeExtensionMethod = {
    HandshakeRequest: "Handshake",
    HandshakeResponse: "HandshakeResponse",
    GetToken: "GetToken",
    Response: "Response",
};
const BrowserCacheLocation = {
    LocalStorage: "localStorage",
    SessionStorage: "sessionStorage",
    MemoryStorage: "memoryStorage",
};
/**
 * HTTP Request types supported by MSAL.
 */
const HTTP_REQUEST_TYPE = {
    GET: "GET",
    POST: "POST",
};
const INTERACTION_TYPE = {
    SIGNIN: "signin",
    SIGNOUT: "signout",
};
/**
 * Temporary cache keys for MSAL, deleted after any request.
 */
const TemporaryCacheKeys = {
    ORIGIN_URI: "request.origin",
    URL_HASH: "urlHash",
    REQUEST_PARAMS: "request.params",
    VERIFIER: "code.verifier",
    INTERACTION_STATUS_KEY: "interaction.status",
    NATIVE_REQUEST: "request.native",
};
/**
 * Cache keys stored in-memory
 */
const InMemoryCacheKeys = {
    WRAPPER_SKU: "wrapper.sku",
    WRAPPER_VER: "wrapper.version",
};
/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 800-899 Auth Code Flow
 */
const ApiId = {
    acquireTokenRedirect: 861,
    acquireTokenPopup: 862,
    ssoSilent: 863,
    acquireTokenSilent_authCode: 864,
    handleRedirectPromise: 865,
    acquireTokenByCode: 866,
    acquireTokenSilent_silentFlow: 61,
    logout: 961,
    logoutPopup: 962,
};
/*
 * Interaction type of the API - used for state and telemetry
 */
var InteractionType;
(function (InteractionType) {
    InteractionType["Redirect"] = "redirect";
    InteractionType["Popup"] = "popup";
    InteractionType["Silent"] = "silent";
    InteractionType["None"] = "none";
})(InteractionType || (InteractionType = {}));
const DEFAULT_REQUEST = {
    scopes: OIDC_DEFAULT_SCOPES,
};
/**
 * JWK Key Format string (Type MUST be defined for window crypto APIs)
 */
const KEY_FORMAT_JWK = "jwk";
// DatabaseStorage Constants
const DB_NAME = "msal.db";
const DB_VERSION = 1;
const DB_TABLE_NAME = `${DB_NAME}.keys`;
const CacheLookupPolicy = {
    /*
     * acquireTokenSilent will attempt to retrieve an access token from the cache. If the access token is expired
     * or cannot be found the refresh token will be used to acquire a new one. Finally, if the refresh token
     * is expired acquireTokenSilent will attempt to acquire new access and refresh tokens.
     */
    Default: 0,
    /*
     * acquireTokenSilent will only look for access tokens in the cache. It will not attempt to renew access or
     * refresh tokens.
     */
    AccessToken: 1,
    /*
     * acquireTokenSilent will attempt to retrieve an access token from the cache. If the access token is expired or
     * cannot be found, the refresh token will be used to acquire a new one. If the refresh token is expired, it
     * will not be renewed and acquireTokenSilent will fail.
     */
    AccessTokenAndRefreshToken: 2,
    /*
     * acquireTokenSilent will not attempt to retrieve access tokens from the cache and will instead attempt to
     * exchange the cached refresh token for a new access token. If the refresh token is expired, it will not be
     * renewed and acquireTokenSilent will fail.
     */
    RefreshToken: 3,
    /*
     * acquireTokenSilent will not look in the cache for the access token. It will go directly to network with the
     * cached refresh token. If the refresh token is expired an attempt will be made to renew it. This is equivalent to
     * setting "forceRefresh: true".
     */
    RefreshTokenAndNetwork: 4,
    /*
     * acquireTokenSilent will attempt to renew both access and refresh tokens. It will not look in the cache. This will
     * always fail if 3rd party cookies are blocked by the browser.
     */
    Skip: 5,
};
const iFrameRenewalPolicies = [
    CacheLookupPolicy.Default,
    CacheLookupPolicy.Skip,
    CacheLookupPolicy.RefreshTokenAndNetwork,
];

export { ApiId, BrowserCacheLocation, BrowserConstants, CacheLookupPolicy, DB_NAME, DB_TABLE_NAME, DB_VERSION, DEFAULT_REQUEST, HTTP_REQUEST_TYPE, INTERACTION_TYPE, InMemoryCacheKeys, InteractionType, KEY_FORMAT_JWK, NativeExtensionMethod, PlatformAuthConstants, TemporaryCacheKeys, iFrameRenewalPolicies };
//# sourceMappingURL=BrowserConstants.mjs.map
