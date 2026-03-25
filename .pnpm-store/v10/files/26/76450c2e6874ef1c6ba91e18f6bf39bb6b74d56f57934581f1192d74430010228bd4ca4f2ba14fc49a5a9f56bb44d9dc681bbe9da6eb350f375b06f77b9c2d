import { AccountInfo, INetworkModule, Logger, CommonSilentFlowRequest, ICrypto, PerformanceCallbackFunction, IPerformanceClient, BaseAuthRequest, AccountFilter } from "@azure/msal-common/browser";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { ApiId, WrapperSKU, CacheLookupPolicy } from "../utils/BrowserConstants.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { EventCallbackFunction } from "../event/EventMessage.js";
import { EventType } from "../event/EventType.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { EventHandler } from "../event/EventHandler.js";
import { PopupClient } from "../interaction_client/PopupClient.js";
import { RedirectClient } from "../interaction_client/RedirectClient.js";
import { SilentIframeClient } from "../interaction_client/SilentIframeClient.js";
import { SilentRefreshClient } from "../interaction_client/SilentRefreshClient.js";
import { ITokenCache } from "../cache/ITokenCache.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SilentCacheClient } from "../interaction_client/SilentCacheClient.js";
import { SilentAuthCodeClient } from "../interaction_client/SilentAuthCodeClient.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { StandardOperatingContext } from "../operatingcontext/StandardOperatingContext.js";
import { BaseOperatingContext } from "../operatingcontext/BaseOperatingContext.js";
import { IController } from "./IController.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { InitializeApplicationRequest } from "../request/InitializeApplicationRequest.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export declare class StandardController implements IController {
    protected readonly operatingContext: StandardOperatingContext;
    protected readonly browserCrypto: ICrypto;
    protected readonly browserStorage: BrowserCacheManager;
    protected readonly nativeInternalStorage: BrowserCacheManager;
    protected readonly networkClient: INetworkModule;
    protected navigationClient: INavigationClient;
    protected readonly config: BrowserConfiguration;
    private tokenCache;
    protected logger: Logger;
    protected isBrowserEnvironment: boolean;
    protected readonly eventHandler: EventHandler;
    protected readonly redirectResponse: Map<string, Promise<AuthenticationResult | null>>;
    protected platformAuthProvider: IPlatformAuthHandler | undefined;
    private hybridAuthCodeResponses;
    protected readonly performanceClient: IPerformanceClient;
    protected initialized: boolean;
    private activeSilentTokenRequests;
    private activeIframeRequest;
    private ssoSilentMeasurement?;
    private acquireTokenByCodeAsyncMeasurement?;
    private pkceCode;
    /**
     * @constructor
     * Constructor for the PublicClientApplication used to instantiate the PublicClientApplication object
     *
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview
     * - authority: the authority URL for your application.
     * - redirect_uri: the uri of your application registered in the portal.
     *
     * In Azure AD, authority is a URL indicating the Azure active directory that MSAL uses to obtain tokens.
     * It is of the form https://login.microsoftonline.com/{Enter_the_Tenant_Info_Here}
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://{instance}/tfp/{tenant}/{policyName}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param configuration Object for the MSAL PublicClientApplication instance
     */
    constructor(operatingContext: StandardOperatingContext);
    static createController(operatingContext: BaseOperatingContext, request?: InitializeApplicationRequest): Promise<IController>;
    private trackPageVisibility;
    /**
     * Initializer function to perform async startup tasks such as connecting to WAM extension
     * @param request {?InitializeApplicationRequest} correlation id
     */
    initialize(request?: InitializeApplicationRequest, isBroker?: boolean): Promise<void>;
    /**
     * Event handler function which allows users to fire events after the PublicClientApplication object
     * has loaded during redirect flows. This should be invoked on all page loads involved in redirect
     * auth flows.
     * @param hash Hash to process. Defaults to the current value of window.location.hash. Only needs to be provided explicitly if the response to be handled is not contained in the current value.
     * @returns Token response or null. If the return value is null, then no auth redirect was detected.
     */
    handleRedirectPromise(hash?: string): Promise<AuthenticationResult | null>;
    /**
     * The internal details of handleRedirectPromise. This is separated out to a helper to allow handleRedirectPromise to memoize requests
     * @param hash
     * @returns
     */
    private handleRedirectPromiseInternal;
    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    acquireTokenRedirect(request: RedirectRequest): Promise<void>;
    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult>;
    private trackPageVisibilityWithMeasurement;
    /**
     * This function uses a hidden iframe to fetch an authorization code from the eSTS. There are cases where this may not work:
     * - Any browser using a form of Intelligent Tracking Prevention
     * - If there is not an established session with the service
     *
     * In these cases, the request must be done inside a popup or full frame redirect.
     *
     * For the cases where interaction is required, you cannot send a request with prompt=none.
     *
     * If your refresh token has expired, you can use this function to fetch a new set of tokens silently as long as
     * you session on the server still exists.
     * @param request {@link SsoSilentRequest}
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    ssoSilent(request: SsoSilentRequest): Promise<AuthenticationResult>;
    /**
     * This function redeems an authorization code (passed as code) from the eSTS token endpoint.
     * This authorization code should be acquired server-side using a confidential client to acquire a spa_code.
     * This API is not indended for normal authorization code acquisition and redemption.
     *
     * Redemption of this authorization code will not require PKCE, as it was acquired by a confidential client.
     *
     * @param request {@link AuthorizationCodeRequest}
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult>;
    /**
     * Creates a SilentAuthCodeClient to redeem an authorization code.
     * @param request
     * @returns Result of the operation to redeem the authorization code
     */
    private acquireTokenByCodeAsync;
    /**
     * Attempt to acquire an access token from the cache
     * @param silentCacheClient SilentCacheClient
     * @param commonRequest CommonSilentFlowRequest
     * @param silentRequest SilentRequest
     * @returns A promise that, when resolved, returns the access token
     */
    protected acquireTokenFromCache(commonRequest: CommonSilentFlowRequest, cacheLookupPolicy: CacheLookupPolicy): Promise<AuthenticationResult>;
    /**
     * Attempt to acquire an access token via a refresh token
     * @param commonRequest CommonSilentFlowRequest
     * @param cacheLookupPolicy CacheLookupPolicy
     * @returns A promise that, when resolved, returns the access token
     */
    acquireTokenByRefreshToken(commonRequest: CommonSilentFlowRequest, cacheLookupPolicy: CacheLookupPolicy): Promise<AuthenticationResult>;
    /**
     * Attempt to acquire an access token via an iframe
     * @param request CommonSilentFlowRequest
     * @returns A promise that, when resolved, returns the access token
     */
    protected acquireTokenBySilentIframe(request: CommonSilentFlowRequest): Promise<AuthenticationResult>;
    /**
     * Deprecated logout function. Use logoutRedirect or logoutPopup instead
     * @param logoutRequest
     * @deprecated
     */
    logout(logoutRequest?: EndSessionRequest): Promise<void>;
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    logoutRedirect(logoutRequest?: EndSessionRequest): Promise<void>;
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logoutPopup(logoutRequest?: EndSessionPopupRequest): Promise<void>;
    /**
     * Creates a cache interaction client to clear broswer cache.
     * @param logoutRequest
     */
    clearCache(logoutRequest?: ClearCacheRequest): Promise<void>;
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter?: AccountFilter): AccountInfo[];
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter: AccountFilter): AccountInfo | null;
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param username
     * @returns The account object stored in MSAL
     */
    getAccountByUsername(username: string): AccountInfo | null;
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByHomeId(homeAccountId: string): AccountInfo | null;
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByLocalId(localAccountId: string): AccountInfo | null;
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account: AccountInfo | null): void;
    /**
     * Gets the currently active account
     */
    getActiveAccount(): AccountInfo | null;
    /**
     * Hydrates the cache with the tokens from an AuthenticationResult
     * @param result
     * @param request
     * @returns
     */
    hydrateCache(result: AuthenticationResult, request: SilentRequest | SsoSilentRequest | RedirectRequest | PopupRequest): Promise<void>;
    /**
     * Acquire a token from native device (e.g. WAM)
     * @param request
     */
    acquireTokenNative(request: PopupRequest | SilentRequest | SsoSilentRequest, apiId: ApiId, accountId?: string, cacheLookupPolicy?: CacheLookupPolicy): Promise<AuthenticationResult>;
    /**
     * Returns boolean indicating if this request can use the platform broker
     * @param request
     */
    canUsePlatformBroker(request: RedirectRequest | PopupRequest | SsoSilentRequest, accountId?: string): boolean;
    /**
     * Get the native accountId from the account
     * @param request
     * @returns
     */
    getNativeAccountId(request: RedirectRequest | PopupRequest | SsoSilentRequest): string;
    /**
     * Returns new instance of the Popup Interaction Client
     * @param correlationId
     */
    createPopupClient(correlationId?: string): PopupClient;
    /**
     * Returns new instance of the Redirect Interaction Client
     * @param correlationId
     */
    protected createRedirectClient(correlationId?: string): RedirectClient;
    /**
     * Returns new instance of the Silent Iframe Interaction Client
     * @param correlationId
     */
    createSilentIframeClient(correlationId?: string): SilentIframeClient;
    /**
     * Returns new instance of the Silent Cache Interaction Client
     */
    protected createSilentCacheClient(correlationId?: string): SilentCacheClient;
    /**
     * Returns new instance of the Silent Refresh Interaction Client
     */
    protected createSilentRefreshClient(correlationId?: string): SilentRefreshClient;
    /**
     * Returns new instance of the Silent AuthCode Interaction Client
     */
    protected createSilentAuthCodeClient(correlationId?: string): SilentAuthCodeClient;
    /**
     * Adds event callbacks to array
     * @param callback
     */
    addEventCallback(callback: EventCallbackFunction, eventTypes?: Array<EventType>): string | null;
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId: string): void;
    /**
     * Registers a callback to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId: string): boolean;
    /**
     * Adds event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    enableAccountStorageEvents(): void;
    /**
     * Removes event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    disableAccountStorageEvents(): void;
    /**
     * Gets the token cache for the application.
     */
    getTokenCache(): ITokenCache;
    /**
     * Returns the logger instance
     */
    getLogger(): Logger;
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger: Logger): void;
    /**
     * Called by wrapper libraries (Angular & React) to set SKU and Version passed down to telemetry, logger, etc.
     * @param sku
     * @param version
     */
    initializeWrapperLibrary(sku: WrapperSKU, version: string): void;
    /**
     * Sets navigation client
     * @param navigationClient
     */
    setNavigationClient(navigationClient: INavigationClient): void;
    /**
     * Returns the configuration object
     */
    getConfiguration(): BrowserConfiguration;
    /**
     * Returns the performance client
     */
    getPerformanceClient(): IPerformanceClient;
    /**
     * Returns the browser env indicator
     */
    isBrowserEnv(): boolean;
    /**
     * Generates a correlation id for a request if none is provided.
     *
     * @protected
     * @param {?Partial<BaseAuthRequest>} [request]
     * @returns {string}
     */
    protected getRequestCorrelationId(request?: Partial<BaseAuthRequest>): string;
    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    loginRedirect(request?: RedirectRequest): Promise<void>;
    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    loginPopup(request?: PopupRequest): Promise<AuthenticationResult>;
    /**
     * Silently acquire an access token for a given set of scopes. Returns currently processing promise if parallel requests are made.
     *
     * @param {@link (SilentRequest:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse} object
     */
    acquireTokenSilent(request: SilentRequest): Promise<AuthenticationResult>;
    /**
     * Checks if identical request is already in flight and returns reference to the existing promise or fires off a new one if this is the first
     * @param request
     * @param account
     * @param correlationId
     * @returns
     */
    private acquireTokenSilentDeduped;
    /**
     * Silently acquire an access token for a given set of scopes. Will use cached token if available, otherwise will attempt to acquire a new token from the network via refresh token.
     * @param {@link (SilentRequest:type)}
     * @param {@link (AccountInfo:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse}
     */
    protected acquireTokenSilentAsync(request: SilentRequest & {
        correlationId: string;
    }, account: AccountInfo): Promise<AuthenticationResult>;
    /**
     * AcquireTokenSilent without the iframe fallback. This is used to enable the correct fallbacks in cases where there's a potential for multiple silent requests to be made in parallel and prevent those requests from making concurrent iframe requests.
     * @param silentRequest
     * @param cacheLookupPolicy
     * @returns
     */
    private acquireTokenSilentNoIframe;
    /**
     * Pre-generates PKCE codes and stores it in local variable
     * @param correlationId
     */
    private preGeneratePkceCodes;
    /**
     * Provides pre-generated PKCE codes, if any
     * @param correlationId
     */
    private getPreGeneratedPkceCodes;
    private logMultipleInstances;
}
//# sourceMappingURL=StandardController.d.ts.map