/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DataBoundary } from "../../account/AccountInfo.js";

/**
 * Enumeration of operations that are instrumented by have their performance measured by the PerformanceClient.
 *
 * @export
 * @enum {number}
 */
export const PerformanceEvents = {
    /**
     * acquireTokenByCode API (msal-browser and msal-node).
     * Used to acquire tokens by trading an authorization code against the token endpoint.
     */
    AcquireTokenByCode: "acquireTokenByCode",

    /**
     * acquireTokenByRefreshToken API (msal-browser and msal-node).
     * Used to renew an access token using a refresh token against the token endpoint.
     */
    AcquireTokenByRefreshToken: "acquireTokenByRefreshToken",

    /**
     * acquireTokenSilent API (msal-browser and msal-node).
     * Used to silently acquire a new access token (from the cache or the network).
     */
    AcquireTokenSilent: "acquireTokenSilent",

    /**
     * acquireTokenSilentAsync (msal-browser).
     * Internal API for acquireTokenSilent.
     */
    AcquireTokenSilentAsync: "acquireTokenSilentAsync",

    /**
     * acquireTokenPopup (msal-browser).
     * Used to acquire a new access token interactively through pop ups
     */
    AcquireTokenPopup: "acquireTokenPopup",

    /**
     * acquireTokenPreRedirect (msal-browser).
     * First part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    AcquireTokenPreRedirect: "acquireTokenPreRedirect",

    /**
     * acquireTokenRedirect (msal-browser).
     * Second part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    AcquireTokenRedirect: "acquireTokenRedirect",

    /**
     * getPublicKeyThumbprint API in CryptoOpts class (msal-browser).
     * Used to generate a public/private keypair and generate a public key thumbprint for pop requests.
     */
    CryptoOptsGetPublicKeyThumbprint: "cryptoOptsGetPublicKeyThumbprint",

    /**
     * signJwt API in CryptoOpts class (msal-browser).
     * Used to signed a pop token.
     */
    CryptoOptsSignJwt: "cryptoOptsSignJwt",

    /**
     * acquireToken API in the SilentCacheClient class (msal-browser).
     * Used to read access tokens from the cache.
     */
    SilentCacheClientAcquireToken: "silentCacheClientAcquireToken",

    /**
     * acquireToken API in the SilentIframeClient class (msal-browser).
     * Used to acquire a new set of tokens from the authorize endpoint in a hidden iframe.
     */
    SilentIframeClientAcquireToken: "silentIframeClientAcquireToken",
    AwaitConcurrentIframe: "awaitConcurrentIframe", // Time spent waiting for a concurrent iframe to complete

    /**
     * acquireToken API in SilentRereshClient (msal-browser).
     * Used to acquire a new set of tokens from the token endpoint using a refresh token.
     */
    SilentRefreshClientAcquireToken: "silentRefreshClientAcquireToken",

    /**
     * ssoSilent API (msal-browser).
     * Used to silently acquire an authorization code and set of tokens using a hidden iframe.
     */
    SsoSilent: "ssoSilent",

    /**
     * getDiscoveredAuthority API in StandardInteractionClient class (msal-browser).
     * Used to load authority metadata for a request.
     */
    StandardInteractionClientGetDiscoveredAuthority:
        "standardInteractionClientGetDiscoveredAuthority",

    /**
     * acquireToken APIs in msal-browser.
     * Used to make an /authorize endpoint call with native brokering enabled.
     */
    FetchAccountIdWithNativeBroker: "fetchAccountIdWithNativeBroker",

    /**
     * acquireToken API in NativeInteractionClient class (msal-browser).
     * Used to acquire a token from Native component when native brokering is enabled.
     */
    NativeInteractionClientAcquireToken: "nativeInteractionClientAcquireToken",
    /**
     * Time spent creating default headers for requests to token endpoint
     */
    BaseClientCreateTokenRequestHeaders: "baseClientCreateTokenRequestHeaders",
    /**
     * Time spent sending/waiting for the response of a request to the token endpoint
     */
    NetworkClientSendPostRequestAsync: "networkClientSendPostRequestAsync",
    RefreshTokenClientExecutePostToTokenEndpoint:
        "refreshTokenClientExecutePostToTokenEndpoint",
    AuthorizationCodeClientExecutePostToTokenEndpoint:
        "authorizationCodeClientExecutePostToTokenEndpoint",
    /**
     * Used to measure the time taken for completing embedded-broker handshake (PW-Broker).
     */
    BrokerHandhshake: "brokerHandshake",
    /**
     * acquireTokenByRefreshToken API in BrokerClientApplication (PW-Broker) .
     */
    AcquireTokenByRefreshTokenInBroker: "acquireTokenByRefreshTokenInBroker",
    /**
     * Time taken for token acquisition by broker
     */
    AcquireTokenByBroker: "acquireTokenByBroker",

    /**
     * Time spent on the network for refresh token acquisition
     */
    RefreshTokenClientExecuteTokenRequest:
        "refreshTokenClientExecuteTokenRequest",

    /**
     * Time taken for acquiring refresh token , records RT size
     */
    RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken",

    /**
     * Time taken for acquiring cached refresh token
     */
    RefreshTokenClientAcquireTokenWithCachedRefreshToken:
        "refreshTokenClientAcquireTokenWithCachedRefreshToken",

    /**
     * acquireTokenByRefreshToken API in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientAcquireTokenByRefreshToken:
        "refreshTokenClientAcquireTokenByRefreshToken",

    /**
     * Helper function to create token request body in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientCreateTokenRequestBody:
        "refreshTokenClientCreateTokenRequestBody",

    /**
     * acquireTokenFromCache (msal-browser).
     * Internal API for acquiring token from cache
     */
    AcquireTokenFromCache: "acquireTokenFromCache",
    SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken",
    SilentFlowClientGenerateResultFromCacheRecord:
        "silentFlowClientGenerateResultFromCacheRecord",

    /**
     * acquireTokenBySilentIframe (msal-browser).
     * Internal API for acquiring token by silent Iframe
     */
    AcquireTokenBySilentIframe: "acquireTokenBySilentIframe",

    /**
     * Internal API for initializing base request in BaseInteractionClient (msal-browser)
     */
    InitializeBaseRequest: "initializeBaseRequest",

    /**
     * Internal API for initializing silent request in SilentCacheClient (msal-browser)
     */
    InitializeSilentRequest: "initializeSilentRequest",

    InitializeClientApplication: "initializeClientApplication",

    InitializeCache: "initializeCache",

    /**
     * Helper function in SilentIframeClient class (msal-browser).
     */
    SilentIframeClientTokenHelper: "silentIframeClientTokenHelper",

    /**
     * SilentHandler
     */
    SilentHandlerInitiateAuthRequest: "silentHandlerInitiateAuthRequest",
    SilentHandlerMonitorIframeForHash: "silentHandlerMonitorIframeForHash",
    SilentHandlerLoadFrame: "silentHandlerLoadFrame",
    SilentHandlerLoadFrameSync: "silentHandlerLoadFrameSync",

    /**
     * Helper functions in StandardInteractionClient class (msal-browser)
     */
    StandardInteractionClientCreateAuthCodeClient:
        "standardInteractionClientCreateAuthCodeClient",
    StandardInteractionClientGetClientConfiguration:
        "standardInteractionClientGetClientConfiguration",
    StandardInteractionClientInitializeAuthorizationRequest:
        "standardInteractionClientInitializeAuthorizationRequest",

    /**
     * getAuthCodeUrl API (msal-browser and msal-node).
     */
    GetAuthCodeUrl: "getAuthCodeUrl",
    GetStandardParams: "getStandardParams",

    /**
     * Functions from InteractionHandler (msal-browser)
     */
    HandleCodeResponseFromServer: "handleCodeResponseFromServer",
    HandleCodeResponse: "handleCodeResponse",
    HandleResponseEar: "handleResponseEar",
    HandleResponsePlatformBroker: "handleResponsePlatformBroker",
    HandleResponseCode: "handleResponseCode",
    UpdateTokenEndpointAuthority: "updateTokenEndpointAuthority",

    /**
     * APIs in Authorization Code Client (msal-common)
     */
    AuthClientAcquireToken: "authClientAcquireToken",
    AuthClientExecuteTokenRequest: "authClientExecuteTokenRequest",
    AuthClientCreateTokenRequestBody: "authClientCreateTokenRequestBody",

    /**
     * Generate functions in PopTokenGenerator (msal-common)
     */
    PopTokenGenerateCnf: "popTokenGenerateCnf",
    PopTokenGenerateKid: "popTokenGenerateKid",

    /**
     * handleServerTokenResponse API in ResponseHandler (msal-common)
     */
    HandleServerTokenResponse: "handleServerTokenResponse",
    DeserializeResponse: "deserializeResponse",

    /**
     * Authority functions
     */
    AuthorityFactoryCreateDiscoveredInstance:
        "authorityFactoryCreateDiscoveredInstance",
    AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync",
    AuthorityResolveEndpointsFromLocalSources:
        "authorityResolveEndpointsFromLocalSources",
    AuthorityGetCloudDiscoveryMetadataFromNetwork:
        "authorityGetCloudDiscoveryMetadataFromNetwork",
    AuthorityUpdateCloudDiscoveryMetadata:
        "authorityUpdateCloudDiscoveryMetadata",
    AuthorityGetEndpointMetadataFromNetwork:
        "authorityGetEndpointMetadataFromNetwork",
    AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata",
    AuthorityUpdateMetadataWithRegionalInformation:
        "authorityUpdateMetadataWithRegionalInformation",

    /**
     * Region Discovery functions
     */
    RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion",
    RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS",
    RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion",

    AcquireTokenByCodeAsync: "acquireTokenByCodeAsync",

    GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork",
    GetCloudDiscoveryMetadataFromNetworkMeasurement:
        "getCloudDiscoveryMetadataFromNetworkMeasurement",

    HandleRedirectPromiseMeasurement: "handleRedirectPromise",
    HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise",

    UpdateCloudDiscoveryMetadataMeasurement:
        "updateCloudDiscoveryMetadataMeasurement",

    UsernamePasswordClientAcquireToken: "usernamePasswordClientAcquireToken",

    NativeMessageHandlerHandshake: "nativeMessageHandlerHandshake",

    NativeGenerateAuthResult: "nativeGenerateAuthResult",

    RemoveHiddenIframe: "removeHiddenIframe",

    /**
     * Cache operations
     */
    ClearTokensAndKeysWithClaims: "clearTokensAndKeysWithClaims",
    CacheManagerGetRefreshToken: "cacheManagerGetRefreshToken",
    ImportExistingCache: "importExistingCache",
    SetUserData: "setUserData",
    LocalStorageUpdated: "localStorageUpdated",

    /**
     * Crypto Operations
     */
    GeneratePkceCodes: "generatePkceCodes",
    GenerateCodeVerifier: "generateCodeVerifier",
    GenerateCodeChallengeFromVerifier: "generateCodeChallengeFromVerifier",
    Sha256Digest: "sha256Digest",
    GetRandomValues: "getRandomValues",
    GenerateHKDF: "generateHKDF",
    GenerateBaseKey: "generateBaseKey",
    Base64Decode: "base64Decode",
    UrlEncodeArr: "urlEncodeArr",
    Encrypt: "encrypt",
    Decrypt: "decrypt",
    GenerateEarKey: "generateEarKey",
    DecryptEarResponse: "decryptEarResponse",
} as const;
export type PerformanceEvents =
    (typeof PerformanceEvents)[keyof typeof PerformanceEvents];

export const PerformanceEventAbbreviations: ReadonlyMap<string, string> =
    new Map([
        [PerformanceEvents.AcquireTokenByCode, "ATByCode"],
        [PerformanceEvents.AcquireTokenByRefreshToken, "ATByRT"],
        [PerformanceEvents.AcquireTokenSilent, "ATS"],
        [PerformanceEvents.AcquireTokenSilentAsync, "ATSAsync"],
        [PerformanceEvents.AcquireTokenPopup, "ATPopup"],
        [PerformanceEvents.AcquireTokenRedirect, "ATRedirect"],
        [
            PerformanceEvents.CryptoOptsGetPublicKeyThumbprint,
            "CryptoGetPKThumb",
        ],
        [PerformanceEvents.CryptoOptsSignJwt, "CryptoSignJwt"],
        [PerformanceEvents.SilentCacheClientAcquireToken, "SltCacheClientAT"],
        [PerformanceEvents.SilentIframeClientAcquireToken, "SltIframeClientAT"],
        [PerformanceEvents.SilentRefreshClientAcquireToken, "SltRClientAT"],
        [PerformanceEvents.SsoSilent, "SsoSlt"],
        [
            PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority,
            "StdIntClientGetDiscAuth",
        ],
        [
            PerformanceEvents.FetchAccountIdWithNativeBroker,
            "FetchAccIdWithNtvBroker",
        ],
        [
            PerformanceEvents.NativeInteractionClientAcquireToken,
            "NtvIntClientAT",
        ],
        [
            PerformanceEvents.BaseClientCreateTokenRequestHeaders,
            "BaseClientCreateTReqHead",
        ],
        [
            PerformanceEvents.NetworkClientSendPostRequestAsync,
            "NetClientSendPost",
        ],
        [
            PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint,
            "RTClientExecPost",
        ],
        [
            PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint,
            "AuthCodeClientExecPost",
        ],
        [PerformanceEvents.BrokerHandhshake, "BrokerHandshake"],
        [
            PerformanceEvents.AcquireTokenByRefreshTokenInBroker,
            "ATByRTInBroker",
        ],
        [PerformanceEvents.AcquireTokenByBroker, "ATByBroker"],
        [
            PerformanceEvents.RefreshTokenClientExecuteTokenRequest,
            "RTClientExecTReq",
        ],
        [PerformanceEvents.RefreshTokenClientAcquireToken, "RTClientAT"],
        [
            PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
            "RTClientATWithCachedRT",
        ],
        [
            PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken,
            "RTClientATByRT",
        ],
        [
            PerformanceEvents.RefreshTokenClientCreateTokenRequestBody,
            "RTClientCreateTReqBody",
        ],
        [PerformanceEvents.AcquireTokenFromCache, "ATFromCache"],
        [
            PerformanceEvents.SilentFlowClientAcquireCachedToken,
            "SltFlowClientATCached",
        ],
        [
            PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord,
            "SltFlowClientGenResFromCache",
        ],
        [PerformanceEvents.AcquireTokenBySilentIframe, "ATBySltIframe"],
        [PerformanceEvents.InitializeBaseRequest, "InitBaseReq"],
        [PerformanceEvents.InitializeSilentRequest, "InitSltReq"],
        [
            PerformanceEvents.InitializeClientApplication,
            "InitClientApplication",
        ],
        [PerformanceEvents.InitializeCache, "InitCache"],
        [PerformanceEvents.ImportExistingCache, "importCache"],
        [PerformanceEvents.SetUserData, "setUserData"],
        [PerformanceEvents.LocalStorageUpdated, "localStorageUpdated"],
        [PerformanceEvents.SilentIframeClientTokenHelper, "SIClientTHelper"],
        [
            PerformanceEvents.SilentHandlerInitiateAuthRequest,
            "SHandlerInitAuthReq",
        ],
        [
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            "SltHandlerMonitorIframeForHash",
        ],
        [PerformanceEvents.SilentHandlerLoadFrame, "SHandlerLoadFrame"],
        [PerformanceEvents.SilentHandlerLoadFrameSync, "SHandlerLoadFrameSync"],

        [
            PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
            "StdIntClientCreateAuthCodeClient",
        ],
        [
            PerformanceEvents.StandardInteractionClientGetClientConfiguration,
            "StdIntClientGetClientConf",
        ],
        [
            PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
            "StdIntClientInitAuthReq",
        ],

        [PerformanceEvents.GetAuthCodeUrl, "GetAuthCodeUrl"],

        [
            PerformanceEvents.HandleCodeResponseFromServer,
            "HandleCodeResFromServer",
        ],
        [PerformanceEvents.HandleCodeResponse, "HandleCodeResp"],
        [PerformanceEvents.HandleResponseEar, "HandleRespEar"],
        [PerformanceEvents.HandleResponseCode, "HandleRespCode"],
        [
            PerformanceEvents.HandleResponsePlatformBroker,
            "HandleRespPlatBroker",
        ],
        [PerformanceEvents.UpdateTokenEndpointAuthority, "UpdTEndpointAuth"],

        [PerformanceEvents.AuthClientAcquireToken, "AuthClientAT"],
        [PerformanceEvents.AuthClientExecuteTokenRequest, "AuthClientExecTReq"],
        [
            PerformanceEvents.AuthClientCreateTokenRequestBody,
            "AuthClientCreateTReqBody",
        ],
        [PerformanceEvents.PopTokenGenerateCnf, "PopTGenCnf"],
        [PerformanceEvents.PopTokenGenerateKid, "PopTGenKid"],
        [PerformanceEvents.HandleServerTokenResponse, "HandleServerTRes"],
        [PerformanceEvents.DeserializeResponse, "DeserializeRes"],
        [
            PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance,
            "AuthFactCreateDiscInst",
        ],
        [
            PerformanceEvents.AuthorityResolveEndpointsAsync,
            "AuthResolveEndpointsAsync",
        ],
        [
            PerformanceEvents.AuthorityResolveEndpointsFromLocalSources,
            "AuthResolveEndpointsFromLocal",
        ],
        [
            PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
            "AuthGetCDMetaFromNet",
        ],
        [
            PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
            "AuthUpdCDMeta",
        ],
        [
            PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
            "AuthUpdCDMetaFromNet",
        ],
        [
            PerformanceEvents.AuthorityUpdateEndpointMetadata,
            "AuthUpdEndpointMeta",
        ],
        [
            PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
            "AuthUpdMetaWithRegInfo",
        ],
        [PerformanceEvents.RegionDiscoveryDetectRegion, "RegDiscDetectReg"],
        [
            PerformanceEvents.RegionDiscoveryGetRegionFromIMDS,
            "RegDiscGetRegFromIMDS",
        ],
        [
            PerformanceEvents.RegionDiscoveryGetCurrentVersion,
            "RegDiscGetCurrentVer",
        ],
        [PerformanceEvents.AcquireTokenByCodeAsync, "ATByCodeAsync"],
        [
            PerformanceEvents.GetEndpointMetadataFromNetwork,
            "GetEndpointMetaFromNet",
        ],
        [
            PerformanceEvents.GetCloudDiscoveryMetadataFromNetworkMeasurement,
            "GetCDMetaFromNet",
        ],
        [
            PerformanceEvents.HandleRedirectPromiseMeasurement,
            "HandleRedirectPromise",
        ],
        [
            PerformanceEvents.HandleNativeRedirectPromiseMeasurement,
            "HandleNtvRedirectPromise",
        ],
        [
            PerformanceEvents.UpdateCloudDiscoveryMetadataMeasurement,
            "UpdateCDMeta",
        ],
        [
            PerformanceEvents.UsernamePasswordClientAcquireToken,
            "UserPassClientAT",
        ],
        [
            PerformanceEvents.NativeMessageHandlerHandshake,
            "NtvMsgHandlerHandshake",
        ],
        [PerformanceEvents.NativeGenerateAuthResult, "NtvGenAuthRes"],
        [PerformanceEvents.RemoveHiddenIframe, "RemoveHiddenIframe"],
        [
            PerformanceEvents.ClearTokensAndKeysWithClaims,
            "ClearTAndKeysWithClaims",
        ],
        [PerformanceEvents.CacheManagerGetRefreshToken, "CacheManagerGetRT"],
        [PerformanceEvents.GeneratePkceCodes, "GenPkceCodes"],
        [PerformanceEvents.GenerateCodeVerifier, "GenCodeVerifier"],
        [
            PerformanceEvents.GenerateCodeChallengeFromVerifier,
            "GenCodeChallengeFromVerifier",
        ],
        [PerformanceEvents.Sha256Digest, "Sha256Digest"],
        [PerformanceEvents.GetRandomValues, "GetRandomValues"],
        [PerformanceEvents.GenerateHKDF, "genHKDF"],
        [PerformanceEvents.GenerateBaseKey, "genBaseKey"],
        [PerformanceEvents.Base64Decode, "b64Decode"],
        [PerformanceEvents.UrlEncodeArr, "urlEncArr"],
        [PerformanceEvents.Encrypt, "encrypt"],
        [PerformanceEvents.Decrypt, "decrypt"],
        [PerformanceEvents.GenerateEarKey, "genEarKey"],
        [PerformanceEvents.DecryptEarResponse, "decryptEarResp"],
    ]);

/**
 * State of the performance event.
 *
 * @export
 * @enum {number}
 */
export const PerformanceEventStatus = {
    NotStarted: 0,
    InProgress: 1,
    Completed: 2,
} as const;
export type PerformanceEventStatus =
    (typeof PerformanceEventStatus)[keyof typeof PerformanceEventStatus];

export type SubMeasurement = {
    name: string;
    startTimeMs: number;
};

/**
 * Performance measurement taken by the library, including metadata about the request and application.
 *
 * @export
 * @typedef {PerformanceEvent}
 */
export type PerformanceEvent = {
    /**
     * Unique id for the event
     *
     * @type {string}
     */
    eventId: string;

    /**
     * State of the perforance measure.
     *
     * @type {PerformanceEventStatus}
     */
    status: PerformanceEventStatus;

    /**
     * Login authority used for the request
     *
     * @type {string}
     */
    authority: string;

    /**
     * Client id for the application
     *
     * @type {string}
     */
    clientId: string;

    /**
     * Correlation ID used for the request
     *
     * @type {string}
     */
    correlationId: string;

    /**
     * End-to-end duration in milliseconds.
     * @date 3/22/2022 - 3:40:05 PM
     *
     * @type {number}
     */
    durationMs?: number;

    /**
     * Visibility of the page when the event completed.
     * Read from: https://developer.mozilla.org/docs/Web/API/Page_Visibility_API
     *
     * @type {?(string | null)}
     */
    endPageVisibility?: string | null;

    /**
     * Whether the result was retrieved from the cache.
     *
     * @type {(boolean | null)}
     */
    fromCache?: boolean | null;

    /**
     * Event name (usually in the form of classNameFunctionName)
     *
     * @type {string}
     */
    name: string;

    /**
     * Visibility of the page when the event completed.
     * Read from: https://developer.mozilla.org/docs/Web/API/Page_Visibility_API
     *
     * @type {?(string | null)}
     */
    startPageVisibility?: string | null;

    /**
     * Unix millisecond timestamp when the event was initiated.
     *
     * @type {number}
     */
    startTimeMs: number;

    /**
     * Whether or the operation completed successfully.
     *
     * @type {(boolean | null)}
     */
    success?: boolean | null;

    /**
     * Add specific error code in case of failure
     *
     * @type {string}
     */
    errorCode?: string;

    /**
     * Add specific sub error code in case of failure
     *
     * @type {string}
     */
    subErrorCode?: string;

    /**
     * Server error number
     */
    serverErrorNo?: string;

    /**
     * Name of the library used for the operation.
     *
     * @type {string}
     */
    libraryName: string;

    /**
     * Version of the library used for the operation.
     *
     * @type {string}
     */
    libraryVersion: string;

    /**
     * Version of the library used last. Used to track upgrades and downgrades
     */
    previousLibraryVersion?: string;

    /**
     * Whether the response is from a native component (e.g., WAM)
     *
     * @type {?boolean}
     */
    isNativeBroker?: boolean;

    /**
     * Platform-specific fields, when calling STS and/or broker for token requests
     */
    isPlatformAuthorizeRequest?: boolean;
    isPlatformBrokerRequest?: boolean;
    brokerErrorName?: string;
    brokerErrorCode?: string;

    /**
     * Request ID returned from the response
     *
     * @type {?string}
     */
    requestId?: string;

    /**
     * Cache lookup policy
     *
     * @type {?number}
     */
    cacheLookupPolicy?: number | undefined;

    /**
     * Cache Outcome
     * @type {?number}
     */
    cacheOutcome?: number;

    /**
     * Amount of time spent in the JS queue in milliseconds.
     *
     * @type {?number}
     */
    queuedTimeMs?: number;

    /**
     * Sub-measurements for internal use. To be deleted before flushing.
     */
    incompleteSubMeasurements?: Map<string, SubMeasurement>;

    visibilityChangeCount?: number;
    incompleteSubsCount?: number;

    /**
     * CorrelationId of the in progress iframe request that was awaited
     */
    awaitIframeCorrelationId?: string;
    /**
     * Amount of times queued in the JS event queue.
     *
     * @type {?number}
     */
    queuedCount?: number;
    /**
     * Amount of manually completed queue events.
     *
     * @type {?number}
     */
    queuedManuallyCompletedCount?: number;

    /**
     * Size of the id token
     *
     * @type {number}
     */
    idTokenSize?: number;

    /**
     *
     * Size of the access token
     *
     * @type {number}
     */

    accessTokenSize?: number;

    /**
     *
     * Size of the refresh token
     *
     * @type {number}
     */

    refreshTokenSize?: number | undefined;

    /**
     * Application name as specified by the app.
     *
     * @type {?string}
     */
    appName?: string;

    /**
     * Application version as specified by the app.
     *
     * @type {?string}
     */
    appVersion?: string;

    /**
     * The following are fields that may be emitted in native broker scenarios
     */
    extensionId?: string;
    extensionVersion?: string;
    matsBrokerVersion?: string;
    matsAccountJoinOnStart?: string;
    matsAccountJoinOnEnd?: string;
    matsDeviceJoin?: string;
    matsPromptBehavior?: string;
    matsApiErrorCode?: number;
    matsUiVisible?: boolean;
    matsSilentCode?: number;
    matsSilentBiSubCode?: number;
    matsSilentMessage?: string;
    matsSilentStatus?: number;
    matsHttpStatus?: number;
    matsHttpEventCount?: number;

    /**
     * Http POST metadata
     */
    httpVerToken?: string;
    httpStatus?: number;
    contentTypeHeader?: string;
    contentLengthHeader?: string;

    /**
     * Platform broker fields
     */
    allowPlatformBroker?: boolean;
    extensionInstalled?: boolean;
    extensionHandshakeTimeoutMs?: number;
    extensionHandshakeTimedOut?: boolean;

    /**
     * Nested App Auth Fields
     */
    nestedAppAuthRequest?: boolean;

    /**
     * Multiple matched access/id/refresh tokens in the cache
     */
    multiMatchedAT?: number;
    multiMatchedID?: number;
    multiMatchedRT?: number;

    errorName?: string;
    errorStack?: string[];

    // Event context as JSON string
    context?: string;

    // Cache Data
    cacheLocation?: string;
    cacheRetentionDays?: number;

    // Number of tokens in the cache to be reported when cache quota is exceeded
    cacheRtCount?: number;
    cacheIdCount?: number;
    cacheAtCount?: number;

    // Scenario id to track custom user prompts
    scenarioId?: string;

    accountType?: "AAD" | "MSA" | "B2C";

    /**
     * Server error that triggers a request retry
     *
     * @type {string}
     */
    retryError?: string;

    embeddedClientId?: string;
    embeddedRedirectUri?: string;

    isAsyncPopup?: boolean;

    rtExpiresOnMs?: number;

    sidFromClaims?: boolean;
    sidFromRequest?: boolean;
    loginHintFromRequest?: boolean;
    loginHintFromUpn?: boolean;
    loginHintFromClaim?: boolean;
    domainHintFromRequest?: boolean;

    prompt?: string;

    usePreGeneratedPkce?: boolean;

    // Number of MSAL JS instances in the frame
    msalInstanceCount?: number;
    // Number of MSAL JS instances using the same client id in the frame
    sameClientIdInstanceCount?: number;

    navigateCallbackResult?: boolean;

    dataBoundary?: DataBoundary;
};

export type PerformanceEventContext = {
    dur?: number;
    err?: string;
    subErr?: string;
    fail?: number;
};

export type PerformanceEventStackedContext = PerformanceEventContext & {
    name?: string;
    childErr?: string;
};

export const IntFields: ReadonlySet<string> = new Set([
    "accessTokenSize",
    "durationMs",
    "idTokenSize",
    "matsSilentStatus",
    "matsHttpStatus",
    "refreshTokenSize",
    "queuedTimeMs",
    "startTimeMs",
    "status",
    "multiMatchedAT",
    "multiMatchedID",
    "multiMatchedRT",
    "unencryptedCacheCount",
    "encryptedCacheExpiredCount",
    "oldAccountCount",
    "oldAccessCount",
    "oldIdCount",
    "oldRefreshCount",
    "currAccountCount",
    "currAccessCount",
    "currIdCount",
    "currRefreshCount",
    "expiredCacheRemovedCount",
    "upgradedCacheCount",
]);
