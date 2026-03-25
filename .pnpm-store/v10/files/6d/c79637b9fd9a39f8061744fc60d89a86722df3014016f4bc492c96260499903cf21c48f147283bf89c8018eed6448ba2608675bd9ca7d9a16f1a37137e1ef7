import { PopupRequest } from "../request/PopupRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
/**
 * Constants
 */
export declare const BrowserConstants: {
    /**
     * Interaction in progress cache value
     */
    INTERACTION_IN_PROGRESS_VALUE: string;
    /**
     * Invalid grant error code
     */
    INVALID_GRANT_ERROR: string;
    /**
     * Default popup window width
     */
    POPUP_WIDTH: number;
    /**
     * Default popup window height
     */
    POPUP_HEIGHT: number;
    /**
     * Name of the popup window starts with
     */
    POPUP_NAME_PREFIX: string;
    /**
     * Default popup monitor poll interval in milliseconds
     */
    DEFAULT_POLL_INTERVAL_MS: number;
    /**
     * Msal-browser SKU
     */
    MSAL_SKU: string;
};
export declare const PlatformAuthConstants: {
    CHANNEL_ID: string;
    PREFERRED_EXTENSION_ID: string;
    MATS_TELEMETRY: string;
    MICROSOFT_ENTRA_BROKERID: string;
    DOM_API_NAME: string;
    PLATFORM_DOM_APIS: string;
    PLATFORM_DOM_PROVIDER: string;
    PLATFORM_EXTENSION_PROVIDER: string;
};
export declare const NativeExtensionMethod: {
    readonly HandshakeRequest: "Handshake";
    readonly HandshakeResponse: "HandshakeResponse";
    readonly GetToken: "GetToken";
    readonly Response: "Response";
};
export type NativeExtensionMethod = (typeof NativeExtensionMethod)[keyof typeof NativeExtensionMethod];
export declare const BrowserCacheLocation: {
    readonly LocalStorage: "localStorage";
    readonly SessionStorage: "sessionStorage";
    readonly MemoryStorage: "memoryStorage";
};
export type BrowserCacheLocation = (typeof BrowserCacheLocation)[keyof typeof BrowserCacheLocation];
/**
 * HTTP Request types supported by MSAL.
 */
export declare const HTTP_REQUEST_TYPE: {
    readonly GET: "GET";
    readonly POST: "POST";
};
export type HTTP_REQUEST_TYPE = (typeof HTTP_REQUEST_TYPE)[keyof typeof HTTP_REQUEST_TYPE];
export declare const INTERACTION_TYPE: {
    readonly SIGNIN: "signin";
    readonly SIGNOUT: "signout";
};
export type INTERACTION_TYPE = (typeof INTERACTION_TYPE)[keyof typeof INTERACTION_TYPE];
/**
 * Temporary cache keys for MSAL, deleted after any request.
 */
export declare const TemporaryCacheKeys: {
    readonly ORIGIN_URI: "request.origin";
    readonly URL_HASH: "urlHash";
    readonly REQUEST_PARAMS: "request.params";
    readonly VERIFIER: "code.verifier";
    readonly INTERACTION_STATUS_KEY: "interaction.status";
    readonly NATIVE_REQUEST: "request.native";
};
export type TemporaryCacheKeys = (typeof TemporaryCacheKeys)[keyof typeof TemporaryCacheKeys];
/**
 * Cache keys stored in-memory
 */
export declare const InMemoryCacheKeys: {
    readonly WRAPPER_SKU: "wrapper.sku";
    readonly WRAPPER_VER: "wrapper.version";
};
export type InMemoryCacheKeys = (typeof InMemoryCacheKeys)[keyof typeof InMemoryCacheKeys];
/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 800-899 Auth Code Flow
 */
export declare const ApiId: {
    readonly acquireTokenRedirect: 861;
    readonly acquireTokenPopup: 862;
    readonly ssoSilent: 863;
    readonly acquireTokenSilent_authCode: 864;
    readonly handleRedirectPromise: 865;
    readonly acquireTokenByCode: 866;
    readonly acquireTokenSilent_silentFlow: 61;
    readonly logout: 961;
    readonly logoutPopup: 962;
};
export type ApiId = (typeof ApiId)[keyof typeof ApiId];
export declare enum InteractionType {
    Redirect = "redirect",
    Popup = "popup",
    Silent = "silent",
    None = "none"
}
/**
 * Types of interaction currently in progress.
 * Used in events in wrapper libraries to invoke functions when certain interaction is in progress or all interactions are complete.
 */
export declare const InteractionStatus: {
    /**
     * Initial status before interaction occurs
     */
    readonly Startup: "startup";
    /**
     * Status set when all login calls occuring
     */
    readonly Login: "login";
    /**
     * Status set when logout call occuring
     */
    readonly Logout: "logout";
    /**
     * Status set for acquireToken calls
     */
    readonly AcquireToken: "acquireToken";
    /**
     * Status set for ssoSilent calls
     */
    readonly SsoSilent: "ssoSilent";
    /**
     * Status set when handleRedirect in progress
     */
    readonly HandleRedirect: "handleRedirect";
    /**
     * Status set when interaction is complete
     */
    readonly None: "none";
};
export type InteractionStatus = (typeof InteractionStatus)[keyof typeof InteractionStatus];
export declare const DEFAULT_REQUEST: RedirectRequest | PopupRequest;
/**
 * JWK Key Format string (Type MUST be defined for window crypto APIs)
 */
export declare const KEY_FORMAT_JWK = "jwk";
export declare const WrapperSKU: {
    readonly React: "@azure/msal-react";
    readonly Angular: "@azure/msal-angular";
};
export type WrapperSKU = (typeof WrapperSKU)[keyof typeof WrapperSKU];
export declare const DB_NAME = "msal.db";
export declare const DB_VERSION = 1;
export declare const DB_TABLE_NAME: string;
export declare const CacheLookupPolicy: {
    readonly Default: 0;
    readonly AccessToken: 1;
    readonly AccessTokenAndRefreshToken: 2;
    readonly RefreshToken: 3;
    readonly RefreshTokenAndNetwork: 4;
    readonly Skip: 5;
};
export type CacheLookupPolicy = (typeof CacheLookupPolicy)[keyof typeof CacheLookupPolicy];
export declare const iFrameRenewalPolicies: CacheLookupPolicy[];
//# sourceMappingURL=BrowserConstants.d.ts.map