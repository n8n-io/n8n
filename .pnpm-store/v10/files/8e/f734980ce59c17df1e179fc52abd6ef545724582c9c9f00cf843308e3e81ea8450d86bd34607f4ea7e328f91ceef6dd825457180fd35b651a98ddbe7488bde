import { DataBoundary } from "../../account/AccountInfo.js";
/**
 * Enumeration of operations that are instrumented by have their performance measured by the PerformanceClient.
 *
 * @export
 * @enum {number}
 */
export declare const PerformanceEvents: {
    /**
     * acquireTokenByCode API (msal-browser and msal-node).
     * Used to acquire tokens by trading an authorization code against the token endpoint.
     */
    readonly AcquireTokenByCode: "acquireTokenByCode";
    /**
     * acquireTokenByRefreshToken API (msal-browser and msal-node).
     * Used to renew an access token using a refresh token against the token endpoint.
     */
    readonly AcquireTokenByRefreshToken: "acquireTokenByRefreshToken";
    /**
     * acquireTokenSilent API (msal-browser and msal-node).
     * Used to silently acquire a new access token (from the cache or the network).
     */
    readonly AcquireTokenSilent: "acquireTokenSilent";
    /**
     * acquireTokenSilentAsync (msal-browser).
     * Internal API for acquireTokenSilent.
     */
    readonly AcquireTokenSilentAsync: "acquireTokenSilentAsync";
    /**
     * acquireTokenPopup (msal-browser).
     * Used to acquire a new access token interactively through pop ups
     */
    readonly AcquireTokenPopup: "acquireTokenPopup";
    /**
     * acquireTokenPreRedirect (msal-browser).
     * First part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    readonly AcquireTokenPreRedirect: "acquireTokenPreRedirect";
    /**
     * acquireTokenRedirect (msal-browser).
     * Second part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    readonly AcquireTokenRedirect: "acquireTokenRedirect";
    /**
     * getPublicKeyThumbprint API in CryptoOpts class (msal-browser).
     * Used to generate a public/private keypair and generate a public key thumbprint for pop requests.
     */
    readonly CryptoOptsGetPublicKeyThumbprint: "cryptoOptsGetPublicKeyThumbprint";
    /**
     * signJwt API in CryptoOpts class (msal-browser).
     * Used to signed a pop token.
     */
    readonly CryptoOptsSignJwt: "cryptoOptsSignJwt";
    /**
     * acquireToken API in the SilentCacheClient class (msal-browser).
     * Used to read access tokens from the cache.
     */
    readonly SilentCacheClientAcquireToken: "silentCacheClientAcquireToken";
    /**
     * acquireToken API in the SilentIframeClient class (msal-browser).
     * Used to acquire a new set of tokens from the authorize endpoint in a hidden iframe.
     */
    readonly SilentIframeClientAcquireToken: "silentIframeClientAcquireToken";
    readonly AwaitConcurrentIframe: "awaitConcurrentIframe";
    /**
     * acquireToken API in SilentRereshClient (msal-browser).
     * Used to acquire a new set of tokens from the token endpoint using a refresh token.
     */
    readonly SilentRefreshClientAcquireToken: "silentRefreshClientAcquireToken";
    /**
     * ssoSilent API (msal-browser).
     * Used to silently acquire an authorization code and set of tokens using a hidden iframe.
     */
    readonly SsoSilent: "ssoSilent";
    /**
     * getDiscoveredAuthority API in StandardInteractionClient class (msal-browser).
     * Used to load authority metadata for a request.
     */
    readonly StandardInteractionClientGetDiscoveredAuthority: "standardInteractionClientGetDiscoveredAuthority";
    /**
     * acquireToken APIs in msal-browser.
     * Used to make an /authorize endpoint call with native brokering enabled.
     */
    readonly FetchAccountIdWithNativeBroker: "fetchAccountIdWithNativeBroker";
    /**
     * acquireToken API in NativeInteractionClient class (msal-browser).
     * Used to acquire a token from Native component when native brokering is enabled.
     */
    readonly NativeInteractionClientAcquireToken: "nativeInteractionClientAcquireToken";
    /**
     * Time spent creating default headers for requests to token endpoint
     */
    readonly BaseClientCreateTokenRequestHeaders: "baseClientCreateTokenRequestHeaders";
    /**
     * Time spent sending/waiting for the response of a request to the token endpoint
     */
    readonly NetworkClientSendPostRequestAsync: "networkClientSendPostRequestAsync";
    readonly RefreshTokenClientExecutePostToTokenEndpoint: "refreshTokenClientExecutePostToTokenEndpoint";
    readonly AuthorizationCodeClientExecutePostToTokenEndpoint: "authorizationCodeClientExecutePostToTokenEndpoint";
    /**
     * Used to measure the time taken for completing embedded-broker handshake (PW-Broker).
     */
    readonly BrokerHandhshake: "brokerHandshake";
    /**
     * acquireTokenByRefreshToken API in BrokerClientApplication (PW-Broker) .
     */
    readonly AcquireTokenByRefreshTokenInBroker: "acquireTokenByRefreshTokenInBroker";
    /**
     * Time taken for token acquisition by broker
     */
    readonly AcquireTokenByBroker: "acquireTokenByBroker";
    /**
     * Time spent on the network for refresh token acquisition
     */
    readonly RefreshTokenClientExecuteTokenRequest: "refreshTokenClientExecuteTokenRequest";
    /**
     * Time taken for acquiring refresh token , records RT size
     */
    readonly RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken";
    /**
     * Time taken for acquiring cached refresh token
     */
    readonly RefreshTokenClientAcquireTokenWithCachedRefreshToken: "refreshTokenClientAcquireTokenWithCachedRefreshToken";
    /**
     * acquireTokenByRefreshToken API in RefreshTokenClient (msal-common).
     */
    readonly RefreshTokenClientAcquireTokenByRefreshToken: "refreshTokenClientAcquireTokenByRefreshToken";
    /**
     * Helper function to create token request body in RefreshTokenClient (msal-common).
     */
    readonly RefreshTokenClientCreateTokenRequestBody: "refreshTokenClientCreateTokenRequestBody";
    /**
     * acquireTokenFromCache (msal-browser).
     * Internal API for acquiring token from cache
     */
    readonly AcquireTokenFromCache: "acquireTokenFromCache";
    readonly SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken";
    readonly SilentFlowClientGenerateResultFromCacheRecord: "silentFlowClientGenerateResultFromCacheRecord";
    /**
     * acquireTokenBySilentIframe (msal-browser).
     * Internal API for acquiring token by silent Iframe
     */
    readonly AcquireTokenBySilentIframe: "acquireTokenBySilentIframe";
    /**
     * Internal API for initializing base request in BaseInteractionClient (msal-browser)
     */
    readonly InitializeBaseRequest: "initializeBaseRequest";
    /**
     * Internal API for initializing silent request in SilentCacheClient (msal-browser)
     */
    readonly InitializeSilentRequest: "initializeSilentRequest";
    readonly InitializeClientApplication: "initializeClientApplication";
    readonly InitializeCache: "initializeCache";
    /**
     * Helper function in SilentIframeClient class (msal-browser).
     */
    readonly SilentIframeClientTokenHelper: "silentIframeClientTokenHelper";
    /**
     * SilentHandler
     */
    readonly SilentHandlerInitiateAuthRequest: "silentHandlerInitiateAuthRequest";
    readonly SilentHandlerMonitorIframeForHash: "silentHandlerMonitorIframeForHash";
    readonly SilentHandlerLoadFrame: "silentHandlerLoadFrame";
    readonly SilentHandlerLoadFrameSync: "silentHandlerLoadFrameSync";
    /**
     * Helper functions in StandardInteractionClient class (msal-browser)
     */
    readonly StandardInteractionClientCreateAuthCodeClient: "standardInteractionClientCreateAuthCodeClient";
    readonly StandardInteractionClientGetClientConfiguration: "standardInteractionClientGetClientConfiguration";
    readonly StandardInteractionClientInitializeAuthorizationRequest: "standardInteractionClientInitializeAuthorizationRequest";
    /**
     * getAuthCodeUrl API (msal-browser and msal-node).
     */
    readonly GetAuthCodeUrl: "getAuthCodeUrl";
    readonly GetStandardParams: "getStandardParams";
    /**
     * Functions from InteractionHandler (msal-browser)
     */
    readonly HandleCodeResponseFromServer: "handleCodeResponseFromServer";
    readonly HandleCodeResponse: "handleCodeResponse";
    readonly HandleResponseEar: "handleResponseEar";
    readonly HandleResponsePlatformBroker: "handleResponsePlatformBroker";
    readonly HandleResponseCode: "handleResponseCode";
    readonly UpdateTokenEndpointAuthority: "updateTokenEndpointAuthority";
    /**
     * APIs in Authorization Code Client (msal-common)
     */
    readonly AuthClientAcquireToken: "authClientAcquireToken";
    readonly AuthClientExecuteTokenRequest: "authClientExecuteTokenRequest";
    readonly AuthClientCreateTokenRequestBody: "authClientCreateTokenRequestBody";
    /**
     * Generate functions in PopTokenGenerator (msal-common)
     */
    readonly PopTokenGenerateCnf: "popTokenGenerateCnf";
    readonly PopTokenGenerateKid: "popTokenGenerateKid";
    /**
     * handleServerTokenResponse API in ResponseHandler (msal-common)
     */
    readonly HandleServerTokenResponse: "handleServerTokenResponse";
    readonly DeserializeResponse: "deserializeResponse";
    /**
     * Authority functions
     */
    readonly AuthorityFactoryCreateDiscoveredInstance: "authorityFactoryCreateDiscoveredInstance";
    readonly AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync";
    readonly AuthorityResolveEndpointsFromLocalSources: "authorityResolveEndpointsFromLocalSources";
    readonly AuthorityGetCloudDiscoveryMetadataFromNetwork: "authorityGetCloudDiscoveryMetadataFromNetwork";
    readonly AuthorityUpdateCloudDiscoveryMetadata: "authorityUpdateCloudDiscoveryMetadata";
    readonly AuthorityGetEndpointMetadataFromNetwork: "authorityGetEndpointMetadataFromNetwork";
    readonly AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata";
    readonly AuthorityUpdateMetadataWithRegionalInformation: "authorityUpdateMetadataWithRegionalInformation";
    /**
     * Region Discovery functions
     */
    readonly RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion";
    readonly RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS";
    readonly RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion";
    readonly AcquireTokenByCodeAsync: "acquireTokenByCodeAsync";
    readonly GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork";
    readonly GetCloudDiscoveryMetadataFromNetworkMeasurement: "getCloudDiscoveryMetadataFromNetworkMeasurement";
    readonly HandleRedirectPromiseMeasurement: "handleRedirectPromise";
    readonly HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise";
    readonly UpdateCloudDiscoveryMetadataMeasurement: "updateCloudDiscoveryMetadataMeasurement";
    readonly UsernamePasswordClientAcquireToken: "usernamePasswordClientAcquireToken";
    readonly NativeMessageHandlerHandshake: "nativeMessageHandlerHandshake";
    readonly NativeGenerateAuthResult: "nativeGenerateAuthResult";
    readonly RemoveHiddenIframe: "removeHiddenIframe";
    /**
     * Cache operations
     */
    readonly ClearTokensAndKeysWithClaims: "clearTokensAndKeysWithClaims";
    readonly CacheManagerGetRefreshToken: "cacheManagerGetRefreshToken";
    readonly ImportExistingCache: "importExistingCache";
    readonly SetUserData: "setUserData";
    readonly LocalStorageUpdated: "localStorageUpdated";
    /**
     * Crypto Operations
     */
    readonly GeneratePkceCodes: "generatePkceCodes";
    readonly GenerateCodeVerifier: "generateCodeVerifier";
    readonly GenerateCodeChallengeFromVerifier: "generateCodeChallengeFromVerifier";
    readonly Sha256Digest: "sha256Digest";
    readonly GetRandomValues: "getRandomValues";
    readonly GenerateHKDF: "generateHKDF";
    readonly GenerateBaseKey: "generateBaseKey";
    readonly Base64Decode: "base64Decode";
    readonly UrlEncodeArr: "urlEncodeArr";
    readonly Encrypt: "encrypt";
    readonly Decrypt: "decrypt";
    readonly GenerateEarKey: "generateEarKey";
    readonly DecryptEarResponse: "decryptEarResponse";
};
export type PerformanceEvents = (typeof PerformanceEvents)[keyof typeof PerformanceEvents];
export declare const PerformanceEventAbbreviations: ReadonlyMap<string, string>;
/**
 * State of the performance event.
 *
 * @export
 * @enum {number}
 */
export declare const PerformanceEventStatus: {
    readonly NotStarted: 0;
    readonly InProgress: 1;
    readonly Completed: 2;
};
export type PerformanceEventStatus = (typeof PerformanceEventStatus)[keyof typeof PerformanceEventStatus];
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
    context?: string;
    cacheLocation?: string;
    cacheRetentionDays?: number;
    cacheRtCount?: number;
    cacheIdCount?: number;
    cacheAtCount?: number;
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
    msalInstanceCount?: number;
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
export declare const IntFields: ReadonlySet<string>;
//# sourceMappingURL=PerformanceEvent.d.ts.map