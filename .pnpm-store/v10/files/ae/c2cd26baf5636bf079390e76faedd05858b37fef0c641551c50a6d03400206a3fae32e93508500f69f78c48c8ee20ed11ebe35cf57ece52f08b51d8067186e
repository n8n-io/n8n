import { CommonAuthorizationUrlRequest, CommonSilentFlowRequest, PerformanceCallbackFunction, AccountInfo, Logger, ICrypto, IPerformanceClient, AccountFilter } from "@azure/msal-common/browser";
import { ITokenCache } from "../cache/ITokenCache.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { ApiId, WrapperSKU } from "../utils/BrowserConstants.js";
import { IController } from "./IController.js";
import { NestedAppOperatingContext } from "../operatingcontext/NestedAppOperatingContext.js";
import { IBridgeProxy } from "../naa/IBridgeProxy.js";
import { NestedAppAuthAdapter } from "../naa/mapping/NestedAppAuthAdapter.js";
import { EventHandler } from "../event/EventHandler.js";
import { EventType } from "../event/EventType.js";
import { EventCallbackFunction } from "../event/EventMessage.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { AccountContext } from "../naa/BridgeAccountContext.js";
import { InitializeApplicationRequest } from "../request/InitializeApplicationRequest.js";
export declare class NestedAppAuthController implements IController {
    protected readonly operatingContext: NestedAppOperatingContext;
    protected readonly bridgeProxy: IBridgeProxy;
    protected readonly browserCrypto: ICrypto;
    protected readonly config: BrowserConfiguration;
    protected readonly browserStorage: BrowserCacheManager;
    protected logger: Logger;
    protected readonly performanceClient: IPerformanceClient;
    protected readonly eventHandler: EventHandler;
    protected readonly nestedAppAuthAdapter: NestedAppAuthAdapter;
    protected currentAccountContext: AccountContext | null;
    constructor(operatingContext: NestedAppOperatingContext);
    /**
     * Factory function to create a new instance of NestedAppAuthController
     * @param operatingContext
     * @returns Promise<IController>
     */
    static createController(operatingContext: NestedAppOperatingContext): Promise<IController>;
    /**
     * Specific implementation of initialize function for NestedAppAuthController
     * @returns
     */
    initialize(request?: InitializeApplicationRequest, isBroker?: boolean): Promise<void>;
    /**
     * Validate the incoming request and add correlationId if not present
     * @param request
     * @returns
     */
    private ensureValidRequest;
    /**
     * Internal implementation of acquireTokenInteractive flow
     * @param request
     * @returns
     */
    private acquireTokenInteractive;
    /**
     * Internal implementation of acquireTokenSilent flow
     * @param request
     * @returns
     */
    private acquireTokenSilentInternal;
    /**
     * acquires tokens from cache
     * @param request
     * @returns
     */
    private acquireTokenFromCache;
    /**
     *
     * @param request
     * @returns
     */
    private acquireTokenFromCacheInternal;
    /**
     * acquireTokenPopup flow implementation
     * @param request
     * @returns
     */
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult>;
    /**
     * acquireTokenRedirect flow is not supported in nested app auth
     * @param request
     */
    acquireTokenRedirect(request: RedirectRequest): Promise<void>;
    /**
     * acquireTokenSilent flow implementation
     * @param silentRequest
     * @returns
     */
    acquireTokenSilent(silentRequest: SilentRequest): Promise<AuthenticationResult>;
    /**
     * Hybrid flow is not currently supported in nested app auth
     * @param request
     */
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult>;
    /**
     * acquireTokenNative flow is not currently supported in nested app auth
     * @param request
     * @param apiId
     * @param accountId
     */
    acquireTokenNative(request: SilentRequest | Partial<Omit<CommonAuthorizationUrlRequest, "requestedClaimsHash" | "responseMode" | "earJwk" | "codeChallenge" | "codeChallengeMethod" | "platformBroker">> | PopupRequest, apiId: ApiId, // eslint-disable-line @typescript-eslint/no-unused-vars
    accountId?: string | undefined): Promise<AuthenticationResult>;
    /**
     * acquireTokenByRefreshToken flow is not currently supported in nested app auth
     * @param commonRequest
     * @param silentRequest
     */
    acquireTokenByRefreshToken(commonRequest: CommonSilentFlowRequest, // eslint-disable-line @typescript-eslint/no-unused-vars
    silentRequest: SilentRequest): Promise<AuthenticationResult>;
    /**
     * Adds event callbacks to array
     * @param callback
     * @param eventTypes
     */
    addEventCallback(callback: EventCallbackFunction, eventTypes?: Array<EventType>): string | null;
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId: string): void;
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    removePerformanceCallback(callbackId: string): boolean;
    enableAccountStorageEvents(): void;
    disableAccountStorageEvents(): void;
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
    handleRedirectPromise(hash?: string | undefined): Promise<AuthenticationResult | null>;
    loginPopup(request?: PopupRequest | undefined): Promise<AuthenticationResult>;
    loginRedirect(request?: RedirectRequest | undefined): Promise<void>;
    logout(logoutRequest?: EndSessionRequest | undefined): Promise<void>;
    logoutRedirect(logoutRequest?: EndSessionRequest | undefined): Promise<void>;
    logoutPopup(logoutRequest?: EndSessionPopupRequest | undefined): Promise<void>;
    ssoSilent(request: Partial<Omit<CommonAuthorizationUrlRequest, "requestedClaimsHash" | "responseMode" | "earJwk" | "codeChallenge" | "codeChallengeMethod" | "platformBroker">>): Promise<AuthenticationResult>;
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
    initializeWrapperLibrary(sku: WrapperSKU, version: string): void;
    setNavigationClient(navigationClient: INavigationClient): void;
    getConfiguration(): BrowserConfiguration;
    isBrowserEnv(): boolean;
    getBrowserCrypto(): ICrypto;
    getPerformanceClient(): IPerformanceClient;
    getRedirectResponse(): Map<string, Promise<AuthenticationResult | null>>;
    clearCache(logoutRequest?: ClearCacheRequest): Promise<void>;
    hydrateCache(result: AuthenticationResult, request: SilentRequest | SsoSilentRequest | RedirectRequest | PopupRequest): Promise<void>;
}
//# sourceMappingURL=NestedAppAuthController.d.ts.map