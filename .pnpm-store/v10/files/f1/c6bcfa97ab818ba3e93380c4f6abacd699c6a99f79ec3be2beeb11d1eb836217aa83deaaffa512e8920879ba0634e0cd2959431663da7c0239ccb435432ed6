/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Enumeration of operations that are instrumented by have their performance measured by the PerformanceClient.
 *
 * @export
 * @enum {number}
 */
const PerformanceEvents = {
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
    AwaitConcurrentIframe: "awaitConcurrentIframe",
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
    StandardInteractionClientGetDiscoveredAuthority: "standardInteractionClientGetDiscoveredAuthority",
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
    RefreshTokenClientExecutePostToTokenEndpoint: "refreshTokenClientExecutePostToTokenEndpoint",
    AuthorizationCodeClientExecutePostToTokenEndpoint: "authorizationCodeClientExecutePostToTokenEndpoint",
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
    RefreshTokenClientExecuteTokenRequest: "refreshTokenClientExecuteTokenRequest",
    /**
     * Time taken for acquiring refresh token , records RT size
     */
    RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken",
    /**
     * Time taken for acquiring cached refresh token
     */
    RefreshTokenClientAcquireTokenWithCachedRefreshToken: "refreshTokenClientAcquireTokenWithCachedRefreshToken",
    /**
     * acquireTokenByRefreshToken API in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientAcquireTokenByRefreshToken: "refreshTokenClientAcquireTokenByRefreshToken",
    /**
     * Helper function to create token request body in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientCreateTokenRequestBody: "refreshTokenClientCreateTokenRequestBody",
    /**
     * acquireTokenFromCache (msal-browser).
     * Internal API for acquiring token from cache
     */
    AcquireTokenFromCache: "acquireTokenFromCache",
    SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken",
    SilentFlowClientGenerateResultFromCacheRecord: "silentFlowClientGenerateResultFromCacheRecord",
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
    StandardInteractionClientCreateAuthCodeClient: "standardInteractionClientCreateAuthCodeClient",
    StandardInteractionClientGetClientConfiguration: "standardInteractionClientGetClientConfiguration",
    StandardInteractionClientInitializeAuthorizationRequest: "standardInteractionClientInitializeAuthorizationRequest",
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
    AuthorityFactoryCreateDiscoveredInstance: "authorityFactoryCreateDiscoveredInstance",
    AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync",
    AuthorityResolveEndpointsFromLocalSources: "authorityResolveEndpointsFromLocalSources",
    AuthorityGetCloudDiscoveryMetadataFromNetwork: "authorityGetCloudDiscoveryMetadataFromNetwork",
    AuthorityUpdateCloudDiscoveryMetadata: "authorityUpdateCloudDiscoveryMetadata",
    AuthorityGetEndpointMetadataFromNetwork: "authorityGetEndpointMetadataFromNetwork",
    AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata",
    AuthorityUpdateMetadataWithRegionalInformation: "authorityUpdateMetadataWithRegionalInformation",
    /**
     * Region Discovery functions
     */
    RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion",
    RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS",
    RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion",
    AcquireTokenByCodeAsync: "acquireTokenByCodeAsync",
    GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork",
    GetCloudDiscoveryMetadataFromNetworkMeasurement: "getCloudDiscoveryMetadataFromNetworkMeasurement",
    HandleRedirectPromiseMeasurement: "handleRedirectPromise",
    HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise",
    UpdateCloudDiscoveryMetadataMeasurement: "updateCloudDiscoveryMetadataMeasurement",
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
};
const PerformanceEventAbbreviations = new Map([
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
const PerformanceEventStatus = {
    NotStarted: 0,
    InProgress: 1,
    Completed: 2,
};
const IntFields = new Set([
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

export { IntFields, PerformanceEventAbbreviations, PerformanceEventStatus, PerformanceEvents };
//# sourceMappingURL=PerformanceEvent.mjs.map
