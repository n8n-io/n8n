/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { DEFAULT_CRYPTO_IMPLEMENTATION, buildStaticAuthorityOptions, PerformanceEvents, TimeUtils, AuthError, OIDC_DEFAULT_SCOPES, AccountEntity, AuthToken } from '@azure/msal-common/browser';
import { InteractionType, CacheLookupPolicy, DEFAULT_REQUEST } from '../utils/BrowserConstants.mjs';
import { CryptoOps } from '../crypto/CryptoOps.mjs';
import { NestedAppAuthAdapter } from '../naa/mapping/NestedAppAuthAdapter.mjs';
import { NestedAppAuthError } from '../error/NestedAppAuthError.mjs';
import { EventHandler } from '../event/EventHandler.mjs';
import { EventType } from '../event/EventType.mjs';
import { BrowserCacheManager, DEFAULT_BROWSER_CACHE_MANAGER } from '../cache/BrowserCacheManager.mjs';
import { getAccount, getAllAccounts, getAccountByUsername, getAccountByHomeId, getAccountByLocalId, setActiveAccount, getActiveAccount } from '../cache/AccountManager.mjs';
import { createNewGuid } from '../crypto/BrowserCrypto.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppAuthController {
    constructor(operatingContext) {
        this.operatingContext = operatingContext;
        const proxy = this.operatingContext.getBridgeProxy();
        if (proxy !== undefined) {
            this.bridgeProxy = proxy;
        }
        else {
            throw new Error("unexpected: bridgeProxy is undefined");
        }
        // Set the configuration.
        this.config = operatingContext.getConfig();
        // Initialize logger
        this.logger = this.operatingContext.getLogger();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = operatingContext.isBrowserEnvironment()
            ? new CryptoOps(this.logger, this.performanceClient, true)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.operatingContext.isBrowserEnvironment()
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, buildStaticAuthorityOptions(this.config.auth))
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
        this.nestedAppAuthAdapter = new NestedAppAuthAdapter(this.config.auth.clientId, this.config.auth.clientCapabilities, this.browserCrypto, this.logger);
        // Set the active account if available
        const accountContext = this.bridgeProxy.getAccountContext();
        this.currentAccountContext = accountContext ? accountContext : null;
    }
    /**
     * Factory function to create a new instance of NestedAppAuthController
     * @param operatingContext
     * @returns Promise<IController>
     */
    static async createController(operatingContext) {
        const controller = new NestedAppAuthController(operatingContext);
        return Promise.resolve(controller);
    }
    /**
     * Specific implementation of initialize function for NestedAppAuthController
     * @returns
     */
    async initialize(request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isBroker) {
        const initCorrelationId = request?.correlationId || createNewGuid();
        await this.browserStorage.initialize(initCorrelationId);
        return Promise.resolve();
    }
    /**
     * Validate the incoming request and add correlationId if not present
     * @param request
     * @returns
     */
    ensureValidRequest(request) {
        if (request?.correlationId) {
            return request;
        }
        return {
            ...request,
            correlationId: this.browserCrypto.createNewGuid(),
        };
    }
    /**
     * Internal implementation of acquireTokenInteractive flow
     * @param request
     * @returns
     */
    async acquireTokenInteractive(request) {
        const validRequest = this.ensureValidRequest(request);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, InteractionType.Popup, validRequest);
        const atPopupMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPopup, validRequest.correlationId);
        atPopupMeasurement.add({ nestedAppAuthRequest: true });
        try {
            const naaRequest = this.nestedAppAuthAdapter.toNaaTokenRequest(validRequest);
            const reqTimestamp = TimeUtils.nowSeconds();
            const response = await this.bridgeProxy.getTokenInteractive(naaRequest);
            const result = {
                ...this.nestedAppAuthAdapter.fromNaaTokenResponse(naaRequest, response, reqTimestamp),
            };
            // cache the tokens in the response
            try {
                // cache hydration can fail in JS Runtime scenario that doesn't support full crypto API
                await this.hydrateCache(result, request);
            }
            catch (error) {
                this.logger.warningPii(`Failed to hydrate cache. Error: ${error}`, validRequest.correlationId);
            }
            // cache the account context in memory after successful token fetch
            this.currentAccountContext = {
                homeAccountId: result.account.homeAccountId,
                environment: result.account.environment,
                tenantId: result.account.tenantId,
            };
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Popup, result);
            atPopupMeasurement.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            atPopupMeasurement.end({
                success: true,
                requestId: result.requestId,
            }, undefined, result.account);
            return result;
        }
        catch (e) {
            const error = e instanceof AuthError
                ? e
                : this.nestedAppAuthAdapter.fromBridgeError(e);
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Popup, null, e);
            atPopupMeasurement.end({
                success: false,
            }, e, request.account);
            throw error;
        }
    }
    /**
     * Internal implementation of acquireTokenSilent flow
     * @param request
     * @returns
     */
    async acquireTokenSilentInternal(request) {
        const validRequest = this.ensureValidRequest(request);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, InteractionType.Silent, validRequest);
        // Look for tokens in the cache first
        const result = await this.acquireTokenFromCache(validRequest);
        if (result) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Silent, result);
            return result;
        }
        // proceed with acquiring tokens via the host
        const ssoSilentMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.SsoSilent, validRequest.correlationId);
        ssoSilentMeasurement.increment({
            visibilityChangeCount: 0,
        });
        ssoSilentMeasurement.add({
            nestedAppAuthRequest: true,
        });
        try {
            const naaRequest = this.nestedAppAuthAdapter.toNaaTokenRequest(validRequest);
            naaRequest.forceRefresh = validRequest.forceRefresh;
            const reqTimestamp = TimeUtils.nowSeconds();
            const response = await this.bridgeProxy.getTokenSilent(naaRequest);
            const result = this.nestedAppAuthAdapter.fromNaaTokenResponse(naaRequest, response, reqTimestamp);
            // cache the tokens in the response
            try {
                // cache hydration can fail in JS Runtime scenario that doesn't support full crypto API
                await this.hydrateCache(result, request);
            }
            catch (error) {
                this.logger.warningPii(`Failed to hydrate cache. Error: ${error}`, validRequest.correlationId);
            }
            // cache the account context in memory after successful token fetch
            this.currentAccountContext = {
                homeAccountId: result.account.homeAccountId,
                environment: result.account.environment,
                tenantId: result.account.tenantId,
            };
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Silent, result);
            ssoSilentMeasurement?.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            ssoSilentMeasurement?.end({
                success: true,
                requestId: result.requestId,
            }, undefined, result.account);
            return result;
        }
        catch (e) {
            const error = e instanceof AuthError
                ? e
                : this.nestedAppAuthAdapter.fromBridgeError(e);
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Silent, null, e);
            ssoSilentMeasurement?.end({
                success: false,
            }, e, request.account);
            throw error;
        }
    }
    /**
     * acquires tokens from cache
     * @param request
     * @returns
     */
    async acquireTokenFromCache(request) {
        const atsMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenSilent, request.correlationId);
        atsMeasurement?.add({
            nestedAppAuthRequest: true,
        });
        // if the request has claims, we cannot look up in the cache
        if (request.claims) {
            this.logger.verbose("Claims are present in the request, skipping cache lookup");
            return null;
        }
        // if the request has forceRefresh, we cannot look up in the cache
        if (request.forceRefresh) {
            this.logger.verbose("forceRefresh is set to true, skipping cache lookup");
            return null;
        }
        // respect cache lookup policy
        let result = null;
        if (!request.cacheLookupPolicy) {
            request.cacheLookupPolicy = CacheLookupPolicy.Default;
        }
        switch (request.cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessToken:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
                result = await this.acquireTokenFromCacheInternal(request);
                break;
            default:
                return null;
        }
        if (result) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Silent, result);
            atsMeasurement.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            atsMeasurement.end({
                success: true,
            }, undefined, result.account);
            return result;
        }
        this.logger.warning("Cached tokens are not found for the account, proceeding with silent token request.");
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Silent, null);
        atsMeasurement.end({
            success: false,
        }, undefined, request.account);
        return null;
    }
    /**
     *
     * @param request
     * @returns
     */
    async acquireTokenFromCacheInternal(request) {
        // always prioritize the account context from the bridge
        const accountContext = this.bridgeProxy.getAccountContext() || this.currentAccountContext;
        let currentAccount = null;
        const correlationId = request.correlationId || this.browserCrypto.createNewGuid();
        if (accountContext) {
            currentAccount = getAccount(accountContext, this.logger, this.browserStorage, correlationId);
        }
        // fall back to brokering if no cached account is found
        if (!currentAccount) {
            this.logger.verbose("No active account found, falling back to the host");
            return Promise.resolve(null);
        }
        this.logger.verbose("active account found, attempting to acquire token silently");
        const authRequest = {
            ...request,
            correlationId: request.correlationId || this.browserCrypto.createNewGuid(),
            authority: request.authority || currentAccount.environment,
            scopes: request.scopes?.length
                ? request.scopes
                : [...OIDC_DEFAULT_SCOPES],
        };
        // fetch access token and check for expiry
        const tokenKeys = this.browserStorage.getTokenKeys();
        const cachedAccessToken = this.browserStorage.getAccessToken(currentAccount, authRequest, tokenKeys, currentAccount.tenantId);
        // If there is no access token, log it and return null
        if (!cachedAccessToken) {
            this.logger.verbose("No cached access token found");
            return Promise.resolve(null);
        }
        else if (TimeUtils.wasClockTurnedBack(cachedAccessToken.cachedAt) ||
            TimeUtils.isTokenExpired(cachedAccessToken.expiresOn, this.config.system.tokenRenewalOffsetSeconds)) {
            this.logger.verbose("Cached access token has expired");
            return Promise.resolve(null);
        }
        const cachedIdToken = this.browserStorage.getIdToken(currentAccount, authRequest.correlationId, tokenKeys, currentAccount.tenantId, this.performanceClient);
        if (!cachedIdToken) {
            this.logger.verbose("No cached id token found");
            return Promise.resolve(null);
        }
        return this.nestedAppAuthAdapter.toAuthenticationResultFromCache(currentAccount, cachedIdToken, cachedAccessToken, authRequest, authRequest.correlationId);
    }
    /**
     * acquireTokenPopup flow implementation
     * @param request
     * @returns
     */
    async acquireTokenPopup(request) {
        return this.acquireTokenInteractive(request);
    }
    /**
     * acquireTokenRedirect flow is not supported in nested app auth
     * @param request
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenRedirect(request) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenSilent flow implementation
     * @param silentRequest
     * @returns
     */
    async acquireTokenSilent(silentRequest) {
        return this.acquireTokenSilentInternal(silentRequest);
    }
    /**
     * Hybrid flow is not currently supported in nested app auth
     * @param request
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenByCode(request // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenNative flow is not currently supported in nested app auth
     * @param request
     * @param apiId
     * @param accountId
     */
    acquireTokenNative(request, apiId, // eslint-disable-line @typescript-eslint/no-unused-vars
    accountId // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenByRefreshToken flow is not currently supported in nested app auth
     * @param commonRequest
     * @param silentRequest
     */
    acquireTokenByRefreshToken(commonRequest, // eslint-disable-line @typescript-eslint/no-unused-vars
    silentRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * Adds event callbacks to array
     * @param callback
     * @param eventTypes
     */
    addEventCallback(callback, eventTypes) {
        return this.eventHandler.addEventCallback(callback, eventTypes);
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        this.eventHandler.removeEventCallback(callbackId);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPerformanceCallback(callback) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removePerformanceCallback(callbackId) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    enableAccountStorageEvents() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    disableAccountStorageEvents() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // #region Account APIs
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAllAccounts(this.logger, this.browserStorage, this.isBrowserEnv(), correlationId, accountFilter);
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccount(accountFilter, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param username
     * @returns The account object stored in MSAL
     */
    getAccountByUsername(username) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByUsername(username, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByHomeId(homeAccountId) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByHomeId(homeAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByLocalId(localAccountId) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByLocalId(localAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        /*
         * StandardController uses this to allow the developer to set the active account
         * in the nested app auth scenario the active account is controlled by the app hosting the nested app
         */
        const correlationId = this.browserCrypto.createNewGuid();
        return setActiveAccount(account, this.browserStorage, correlationId);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        const correlationId = this.browserCrypto.createNewGuid();
        return getActiveAccount(this.browserStorage, correlationId);
    }
    // #endregion
    handleRedirectPromise(hash // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        return Promise.resolve(null);
    }
    loginPopup(request // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        return this.acquireTokenInteractive(request || DEFAULT_REQUEST);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRedirect(request) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(logoutRequest) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    logoutRedirect(logoutRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    logoutPopup(logoutRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    ssoSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        return this.acquireTokenSilentInternal(request);
    }
    getTokenCache() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * Returns the logger instance
     */
    getLogger() {
        return this.logger;
    }
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger) {
        this.logger = logger;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeWrapperLibrary(sku, version) {
        /*
         * Standard controller uses this to set the sku and version of the wrapper library in the storage
         * we do nothing here
         */
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNavigationClient(navigationClient) {
        this.logger.warning("setNavigationClient is not supported in nested app auth");
    }
    getConfiguration() {
        return this.config;
    }
    isBrowserEnv() {
        return this.operatingContext.isBrowserEnvironment();
    }
    getBrowserCrypto() {
        return this.browserCrypto;
    }
    getPerformanceClient() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    getRedirectResponse() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearCache(logoutRequest) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    async hydrateCache(result, request) {
        this.logger.verbose("hydrateCache called");
        const accountEntity = AccountEntity.createFromAccountInfo(result.account, result.cloudGraphHostName, result.msGraphHost);
        await this.browserStorage.setAccount(accountEntity, result.correlationId, AuthToken.isKmsi(result.idTokenClaims));
        return this.browserStorage.hydrateCache(result, request);
    }
}

export { NestedAppAuthController };
//# sourceMappingURL=NestedAppAuthController.mjs.map
