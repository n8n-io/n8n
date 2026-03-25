/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { OIDC_DEFAULT_SCOPES } from "@azure/msal-common/browser";
import { PopupRequest } from "../request/PopupRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";

/**
 * Constants
 */
export const BrowserConstants = {
    /**
     * Interaction in progress cache value
     */
    INTERACTION_IN_PROGRESS_VALUE: "interaction_in_progress",
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

export const PlatformAuthConstants = {
    CHANNEL_ID: "53ee284d-920a-4b59-9d30-a60315b26836",
    PREFERRED_EXTENSION_ID: "ppnbnpeolgkicgegkbkbjmhlideopiji",
    MATS_TELEMETRY: "MATS",
    MICROSOFT_ENTRA_BROKERID: "MicrosoftEntra",
    DOM_API_NAME: "DOM API",
    PLATFORM_DOM_APIS: "get-token-and-sign-out",
    PLATFORM_DOM_PROVIDER: "PlatformAuthDOMHandler",
    PLATFORM_EXTENSION_PROVIDER: "PlatformAuthExtensionHandler",
};

export const NativeExtensionMethod = {
    HandshakeRequest: "Handshake",
    HandshakeResponse: "HandshakeResponse",
    GetToken: "GetToken",
    Response: "Response",
} as const;
export type NativeExtensionMethod =
    (typeof NativeExtensionMethod)[keyof typeof NativeExtensionMethod];

export const BrowserCacheLocation = {
    LocalStorage: "localStorage",
    SessionStorage: "sessionStorage",
    MemoryStorage: "memoryStorage",
} as const;
export type BrowserCacheLocation =
    (typeof BrowserCacheLocation)[keyof typeof BrowserCacheLocation];

/**
 * HTTP Request types supported by MSAL.
 */
export const HTTP_REQUEST_TYPE = {
    GET: "GET",
    POST: "POST",
} as const;
export type HTTP_REQUEST_TYPE =
    (typeof HTTP_REQUEST_TYPE)[keyof typeof HTTP_REQUEST_TYPE];

export const INTERACTION_TYPE = {
    SIGNIN: "signin",
    SIGNOUT: "signout",
} as const;
export type INTERACTION_TYPE =
    (typeof INTERACTION_TYPE)[keyof typeof INTERACTION_TYPE];

/**
 * Temporary cache keys for MSAL, deleted after any request.
 */
export const TemporaryCacheKeys = {
    ORIGIN_URI: "request.origin",
    URL_HASH: "urlHash",
    REQUEST_PARAMS: "request.params",
    VERIFIER: "code.verifier",
    INTERACTION_STATUS_KEY: "interaction.status",
    NATIVE_REQUEST: "request.native",
} as const;
export type TemporaryCacheKeys =
    (typeof TemporaryCacheKeys)[keyof typeof TemporaryCacheKeys];

/**
 * Cache keys stored in-memory
 */
export const InMemoryCacheKeys = {
    WRAPPER_SKU: "wrapper.sku",
    WRAPPER_VER: "wrapper.version",
} as const;
export type InMemoryCacheKeys =
    (typeof InMemoryCacheKeys)[keyof typeof InMemoryCacheKeys];

/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 800-899 Auth Code Flow
 */
export const ApiId = {
    acquireTokenRedirect: 861,
    acquireTokenPopup: 862,
    ssoSilent: 863,
    acquireTokenSilent_authCode: 864,
    handleRedirectPromise: 865,
    acquireTokenByCode: 866,
    acquireTokenSilent_silentFlow: 61,
    logout: 961,
    logoutPopup: 962,
} as const;
export type ApiId = (typeof ApiId)[keyof typeof ApiId];

/*
 * Interaction type of the API - used for state and telemetry
 */
export enum InteractionType {
    Redirect = "redirect",
    Popup = "popup",
    Silent = "silent",
    None = "none",
}

/**
 * Types of interaction currently in progress.
 * Used in events in wrapper libraries to invoke functions when certain interaction is in progress or all interactions are complete.
 */
export const InteractionStatus = {
    /**
     * Initial status before interaction occurs
     */
    Startup: "startup",
    /**
     * Status set when all login calls occuring
     */
    Login: "login",
    /**
     * Status set when logout call occuring
     */
    Logout: "logout",
    /**
     * Status set for acquireToken calls
     */
    AcquireToken: "acquireToken",
    /**
     * Status set for ssoSilent calls
     */
    SsoSilent: "ssoSilent",
    /**
     * Status set when handleRedirect in progress
     */
    HandleRedirect: "handleRedirect",
    /**
     * Status set when interaction is complete
     */
    None: "none",
} as const;
export type InteractionStatus =
    (typeof InteractionStatus)[keyof typeof InteractionStatus];

export const DEFAULT_REQUEST: RedirectRequest | PopupRequest = {
    scopes: OIDC_DEFAULT_SCOPES,
};

/**
 * JWK Key Format string (Type MUST be defined for window crypto APIs)
 */
export const KEY_FORMAT_JWK = "jwk";

// Supported wrapper SKUs
export const WrapperSKU = {
    React: "@azure/msal-react",
    Angular: "@azure/msal-angular",
} as const;
export type WrapperSKU = (typeof WrapperSKU)[keyof typeof WrapperSKU];

// DatabaseStorage Constants
export const DB_NAME = "msal.db";
export const DB_VERSION = 1;
export const DB_TABLE_NAME = `${DB_NAME}.keys`;

export const CacheLookupPolicy = {
    /*
     * acquireTokenSilent will attempt to retrieve an access token from the cache. If the access token is expired
     * or cannot be found the refresh token will be used to acquire a new one. Finally, if the refresh token
     * is expired acquireTokenSilent will attempt to acquire new access and refresh tokens.
     */
    Default: 0, // 0 is falsy, is equivalent to not passing in a CacheLookupPolicy
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
} as const;
export type CacheLookupPolicy =
    (typeof CacheLookupPolicy)[keyof typeof CacheLookupPolicy];

export const iFrameRenewalPolicies: CacheLookupPolicy[] = [
    CacheLookupPolicy.Default,
    CacheLookupPolicy.Skip,
    CacheLookupPolicy.RefreshTokenAndNetwork,
];
