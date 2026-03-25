/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CommonAuthorizationUrlRequest,
    CommonSilentFlowRequest,
    PerformanceCallbackFunction,
    AccountInfo,
    Logger,
    ICrypto,
    IPerformanceClient,
    DEFAULT_CRYPTO_IMPLEMENTATION,
    AccountFilter,
} from "@azure/msal-common/browser";
import { ITokenCache } from "../cache/ITokenCache.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import {
    BrowserCacheManager,
    DEFAULT_BROWSER_CACHE_MANAGER,
} from "../cache/BrowserCacheManager.js";
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
import { CryptoOps } from "../crypto/CryptoOps.js";
import {
    blockAPICallsBeforeInitialize,
    blockNonBrowserEnvironment,
} from "../utils/BrowserUtils.js";
import { EventCallbackFunction } from "../event/EventMessage.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { EventType } from "../event/EventType.js";
import { EventHandler } from "../event/EventHandler.js";

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
export class UnknownOperatingContextController implements IController {
    // OperatingContext
    protected readonly operatingContext: UnknownOperatingContext;

    // Logger
    protected logger: Logger;

    // Storage interface implementation
    protected readonly browserStorage: BrowserCacheManager;

    // Input configuration by developer/user
    protected readonly config: BrowserConfiguration;

    // Performance telemetry client
    protected readonly performanceClient: IPerformanceClient;

    // Event handler
    private readonly eventHandler: EventHandler;

    // Crypto interface implementation
    protected readonly browserCrypto: ICrypto;

    // Flag to indicate if in browser environment
    protected isBrowserEnvironment: boolean;

    // Flag representing whether or not the initialize API has been called and completed
    protected initialized: boolean = false;

    constructor(operatingContext: UnknownOperatingContext) {
        this.operatingContext = operatingContext;

        this.isBrowserEnvironment =
            this.operatingContext.isBrowserEnvironment();

        this.config = operatingContext.getConfig();

        this.logger = operatingContext.getLogger();

        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;

        // Initialize the crypto class.
        this.browserCrypto = this.isBrowserEnvironment
            ? new CryptoOps(this.logger, this.performanceClient)
            : DEFAULT_CRYPTO_IMPLEMENTATION;

        this.eventHandler = new EventHandler(this.logger);

        // Initialize the browser storage class.
        this.browserStorage = this.isBrowserEnvironment
            ? new BrowserCacheManager(
                  this.config.auth.clientId,
                  this.config.cache,
                  this.browserCrypto,
                  this.logger,
                  this.performanceClient,
                  this.eventHandler,
                  undefined
              )
            : DEFAULT_BROWSER_CACHE_MANAGER(
                  this.config.auth.clientId,
                  this.logger,
                  this.performanceClient,
                  this.eventHandler
              );
    }
    getBrowserStorage(): BrowserCacheManager {
        return this.browserStorage;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccount(accountFilter: AccountFilter): AccountInfo | null {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByHomeId(homeAccountId: string): AccountInfo | null {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByLocalId(localAccountId: string): AccountInfo | null {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByUsername(username: string): AccountInfo | null {
        return null;
    }
    getAllAccounts(): AccountInfo[] {
        return [];
    }
    initialize(): Promise<void> {
        this.initialized = true;
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenRedirect(request: RedirectRequest): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return Promise.resolve();
    }
    acquireTokenSilent(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        silentRequest: SilentRequest
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    acquireTokenByCode(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request: AuthorizationCodeRequest
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    acquireTokenNative(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request:
            | PopupRequest
            | SilentRequest
            | Partial<
                  Omit<
                      CommonAuthorizationUrlRequest,
                      | "responseMode"
                      | "earJwk"
                      | "codeChallenge"
                      | "codeChallengeMethod"
                      | "requestedClaimsHash"
                      | "platformBroker"
                  >
              >,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        apiId: ApiId,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        accountId?: string | undefined
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    acquireTokenByRefreshToken(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        commonRequest: CommonSilentFlowRequest,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        silentRequest: SilentRequest
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    addEventCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        callback: EventCallbackFunction,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eventTypes?: Array<EventType>
    ): string | null {
        return null;
    }
    removeEventCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        callbackId: string
    ): void {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPerformanceCallback(callback: PerformanceCallbackFunction): string {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return "";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removePerformanceCallback(callbackId: string): boolean {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    enableAccountStorageEvents(): void {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    disableAccountStorageEvents(): void {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }

    handleRedirectPromise(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        hash?: string | undefined
    ): Promise<AuthenticationResult | null> {
        blockAPICallsBeforeInitialize(this.initialized);
        return Promise.resolve(null);
    }
    loginPopup(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request?: PopupRequest | undefined
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRedirect(request?: RedirectRequest | undefined): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<void>;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(logoutRequest?: EndSessionRequest | undefined): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<void>;
    }
    logoutRedirect(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        logoutRequest?: EndSessionRequest | undefined
    ): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<void>;
    }
    logoutPopup(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        logoutRequest?: EndSessionPopupRequest | undefined
    ): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<void>;
    }
    ssoSilent(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request: Partial<
            Omit<
                CommonAuthorizationUrlRequest,
                | "responseMode"
                | "earJwk"
                | "codeChallenge"
                | "codeChallengeMethod"
                | "requestedClaimsHash"
                | "platformBroker"
            >
        >
    ): Promise<AuthenticationResult> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Promise<AuthenticationResult>;
    }
    getTokenCache(): ITokenCache {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as ITokenCache;
    }
    getLogger(): Logger {
        return this.logger;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setLogger(logger: Logger): void {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setActiveAccount(account: AccountInfo | null): void {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getActiveAccount(): AccountInfo | null {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeWrapperLibrary(sku: WrapperSKU, version: string): void {
        this.browserStorage.setWrapperMetadata(sku, version);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNavigationClient(navigationClient: INavigationClient): void {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getConfiguration(): BrowserConfiguration {
        return this.config;
    }
    isBrowserEnv(): boolean {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    getBrowserCrypto(): ICrypto {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as ICrypto;
    }
    getPerformanceClient(): IPerformanceClient {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as IPerformanceClient;
    }
    getRedirectResponse(): Map<string, Promise<AuthenticationResult | null>> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {} as Map<string, Promise<AuthenticationResult | null>>;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearCache(logoutRequest?: ClearCacheRequest): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async hydrateCache(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        result: AuthenticationResult,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request:
            | SilentRequest
            | SsoSilentRequest
            | RedirectRequest
            | PopupRequest
    ): Promise<void> {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
}
