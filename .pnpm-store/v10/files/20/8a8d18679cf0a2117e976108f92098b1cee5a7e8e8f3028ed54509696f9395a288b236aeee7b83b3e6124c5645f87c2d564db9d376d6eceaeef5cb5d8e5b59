import { CommonAuthorizationUrlRequest, CommonSilentFlowRequest, PerformanceCallbackFunction, AccountInfo, Logger, ICrypto, IPerformanceClient, AccountFilter } from "@azure/msal-common/browser";
import { ITokenCache } from "../cache/ITokenCache.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ApiId, WrapperSKU } from "../utils/BrowserConstants.js";
import { IController } from "./IController.js";
import { UnknownOperatingContext } from "../operatingcontext/UnknownOperatingContext.js";
import { EventCallbackFunction } from "../event/EventMessage.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { EventType } from "../event/EventType.js";
/**
 * UnknownOperatingContextController class
 *
 * - Until initialize method is called, this controller is the default
 * - AFter initialize method is called, this controller will be swapped out for the appropriate controller
 * if the operating context can be determined; otherwise this controller will continued be used
 *
 * - Why do we have this?  We don't want to dynamically import (download) all of the code in StandardController if we don't need to.
 *
 * - Only includes implementation for getAccounts and handleRedirectPromise
 *   - All other methods are will throw initialization error (because either initialize method or the factory method were not used)
 *   - This controller is necessary for React Native wrapper, server side rendering and any other scenario where we don't have a DOM
 *
 */
export declare class UnknownOperatingContextController implements IController {
    protected readonly operatingContext: UnknownOperatingContext;
    protected logger: Logger;
    protected readonly browserStorage: BrowserCacheManager;
    protected readonly config: BrowserConfiguration;
    protected readonly performanceClient: IPerformanceClient;
    private readonly eventHandler;
    protected readonly browserCrypto: ICrypto;
    protected isBrowserEnvironment: boolean;
    protected initialized: boolean;
    constructor(operatingContext: UnknownOperatingContext);
    getBrowserStorage(): BrowserCacheManager;
    getAccount(accountFilter: AccountFilter): AccountInfo | null;
    getAccountByHomeId(homeAccountId: string): AccountInfo | null;
    getAccountByLocalId(localAccountId: string): AccountInfo | null;
    getAccountByUsername(username: string): AccountInfo | null;
    getAllAccounts(): AccountInfo[];
    initialize(): Promise<void>;
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult>;
    acquireTokenRedirect(request: RedirectRequest): Promise<void>;
    acquireTokenSilent(silentRequest: SilentRequest): Promise<AuthenticationResult>;
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult>;
    acquireTokenNative(request: PopupRequest | SilentRequest | Partial<Omit<CommonAuthorizationUrlRequest, "responseMode" | "earJwk" | "codeChallenge" | "codeChallengeMethod" | "requestedClaimsHash" | "platformBroker">>, apiId: ApiId, accountId?: string | undefined): Promise<AuthenticationResult>;
    acquireTokenByRefreshToken(commonRequest: CommonSilentFlowRequest, silentRequest: SilentRequest): Promise<AuthenticationResult>;
    addEventCallback(callback: EventCallbackFunction, eventTypes?: Array<EventType>): string | null;
    removeEventCallback(callbackId: string): void;
    addPerformanceCallback(callback: PerformanceCallbackFunction): string;
    removePerformanceCallback(callbackId: string): boolean;
    enableAccountStorageEvents(): void;
    disableAccountStorageEvents(): void;
    handleRedirectPromise(hash?: string | undefined): Promise<AuthenticationResult | null>;
    loginPopup(request?: PopupRequest | undefined): Promise<AuthenticationResult>;
    loginRedirect(request?: RedirectRequest | undefined): Promise<void>;
    logout(logoutRequest?: EndSessionRequest | undefined): Promise<void>;
    logoutRedirect(logoutRequest?: EndSessionRequest | undefined): Promise<void>;
    logoutPopup(logoutRequest?: EndSessionPopupRequest | undefined): Promise<void>;
    ssoSilent(request: Partial<Omit<CommonAuthorizationUrlRequest, "responseMode" | "earJwk" | "codeChallenge" | "codeChallengeMethod" | "requestedClaimsHash" | "platformBroker">>): Promise<AuthenticationResult>;
    getTokenCache(): ITokenCache;
    getLogger(): Logger;
    setLogger(logger: Logger): void;
    setActiveAccount(account: AccountInfo | null): void;
    getActiveAccount(): AccountInfo | null;
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
//# sourceMappingURL=UnknownOperatingContextController.d.ts.map