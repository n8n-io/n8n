/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CryptoOps } from '../crypto/CryptoOps.mjs';
import { DEFAULT_CRYPTO_IMPLEMENTATION, buildStaticAuthorityOptions, PerformanceEvents, invokeAsync, invoke, InteractionRequiredAuthError, createClientAuthError, ClientAuthErrorCodes, AccountEntity, AuthToken, PromptValue, Constants, AuthError, getRequestThumbprint, InteractionRequiredAuthErrorCodes } from '@azure/msal-common/browser';
import { BrowserCacheManager, DEFAULT_BROWSER_CACHE_MANAGER } from '../cache/BrowserCacheManager.mjs';
import { getAllAccounts, getAccount, getAccountByUsername, getAccountByHomeId, getAccountByLocalId, setActiveAccount, getActiveAccount } from '../cache/AccountManager.mjs';
import { BrowserCacheLocation, INTERACTION_TYPE, InteractionType, ApiId, CacheLookupPolicy, DEFAULT_REQUEST, iFrameRenewalPolicies, BrowserConstants } from '../utils/BrowserConstants.mjs';
import { blockAPICallsBeforeInitialize, redirectPreflightCheck, preflightCheck as preflightCheck$1, blockNonBrowserEnvironment } from '../utils/BrowserUtils.mjs';
import { EventType } from '../event/EventType.mjs';
import { EventHandler } from '../event/EventHandler.mjs';
import { PopupClient } from '../interaction_client/PopupClient.mjs';
import { RedirectClient } from '../interaction_client/RedirectClient.mjs';
import { SilentIframeClient } from '../interaction_client/SilentIframeClient.mjs';
import { SilentRefreshClient } from '../interaction_client/SilentRefreshClient.mjs';
import { TokenCache } from '../cache/TokenCache.mjs';
import { PlatformAuthInteractionClient } from '../interaction_client/PlatformAuthInteractionClient.mjs';
import { NativeAuthError, isFatalNativeAuthError } from '../error/NativeAuthError.mjs';
import { SilentCacheClient } from '../interaction_client/SilentCacheClient.mjs';
import { SilentAuthCodeClient } from '../interaction_client/SilentAuthCodeClient.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { createNewGuid } from '../crypto/BrowserCrypto.mjs';
import { initializeSilentRequest } from '../request/RequestHelpers.mjs';
import { generatePkceCodes } from '../crypto/PkceGenerator.mjs';
import { getPlatformAuthProvider, isPlatformAuthAllowed } from '../broker/nativeBroker/PlatformAuthProvider.mjs';
import { collectInstanceStats } from '../utils/MsalFrameStatsUtils.mjs';
import { spaCodeAndNativeAccountIdPresent, unableToAcquireTokenFromNativePlatform, authCodeOrNativeAccountIdRequired, nativeConnectionNotEstablished, noAccountError } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function preflightCheck(initialized, performanceEvent, account) {
    try {
        preflightCheck$1(initialized);
    }
    catch (e) {
        performanceEvent.end({ success: false }, e, account);
        throw e;
    }
}
class StandardController {
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
    constructor(operatingContext) {
        this.operatingContext = operatingContext;
        this.isBrowserEnvironment =
            this.operatingContext.isBrowserEnvironment();
        // Set the configuration.
        this.config = operatingContext.getConfig();
        this.initialized = false;
        // Initialize logger
        this.logger = this.operatingContext.getLogger();
        // Initialize the network module class.
        this.networkClient = this.config.system.networkClient;
        // Initialize the navigation client class.
        this.navigationClient = this.config.system.navigationClient;
        // Initialize redirectResponse Map
        this.redirectResponse = new Map();
        // Initial hybrid spa map
        this.hybridAuthCodeResponses = new Map();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = this.isBrowserEnvironment
            ? new CryptoOps(this.logger, this.performanceClient)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.isBrowserEnvironment
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, buildStaticAuthorityOptions(this.config.auth))
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
        // initialize in memory storage for native flows
        const nativeCacheOptions = {
            cacheLocation: BrowserCacheLocation.MemoryStorage,
            cacheRetentionDays: 5,
            temporaryCacheLocation: BrowserCacheLocation.MemoryStorage,
            storeAuthStateInCookie: false,
            secureCookies: false,
            cacheMigrationEnabled: false,
            claimsBasedCachingEnabled: false,
        };
        this.nativeInternalStorage = new BrowserCacheManager(this.config.auth.clientId, nativeCacheOptions, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler);
        // Initialize the token cache
        this.tokenCache = new TokenCache(this.config, this.browserStorage, this.logger, this.browserCrypto);
        this.activeSilentTokenRequests = new Map();
        // Register listener functions
        this.trackPageVisibility = this.trackPageVisibility.bind(this);
        // Register listener functions
        this.trackPageVisibilityWithMeasurement =
            this.trackPageVisibilityWithMeasurement.bind(this);
    }
    static async createController(operatingContext, request) {
        const controller = new StandardController(operatingContext);
        await controller.initialize(request);
        return controller;
    }
    trackPageVisibility(correlationId) {
        if (!correlationId) {
            return;
        }
        this.logger.info("Perf: Visibility change detected");
        this.performanceClient.incrementFields({ visibilityChangeCount: 1 }, correlationId);
    }
    /**
     * Initializer function to perform async startup tasks such as connecting to WAM extension
     * @param request {?InitializeApplicationRequest} correlation id
     */
    async initialize(request, isBroker) {
        this.logger.trace("initialize called");
        if (this.initialized) {
            this.logger.info("initialize has already been called, exiting early.");
            return;
        }
        if (!this.isBrowserEnvironment) {
            this.logger.info("in non-browser environment, exiting early.");
            this.initialized = true;
            this.eventHandler.emitEvent(EventType.INITIALIZE_END);
            return;
        }
        const initCorrelationId = request?.correlationId || this.getRequestCorrelationId();
        const allowPlatformBroker = this.config.system.allowPlatformBroker;
        const initMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.InitializeClientApplication, initCorrelationId);
        this.eventHandler.emitEvent(EventType.INITIALIZE_START);
        // Broker applications are initialized twice, so we avoid double-counting it
        if (!isBroker) {
            try {
                this.logMultipleInstances(initMeasurement);
            }
            catch { }
        }
        await invokeAsync(this.browserStorage.initialize.bind(this.browserStorage), PerformanceEvents.InitializeCache, this.logger, this.performanceClient, initCorrelationId)(initCorrelationId);
        if (allowPlatformBroker) {
            try {
                // check if platform authentication is available via DOM or browser extension and create relevant handlers
                this.platformAuthProvider = await getPlatformAuthProvider(this.logger, this.performanceClient, initCorrelationId, this.config.system.nativeBrokerHandshakeTimeout, this.config.system.allowPlatformBrokerWithDOM);
            }
            catch (e) {
                this.logger.verbose(e);
            }
        }
        if (!this.config.cache.claimsBasedCachingEnabled) {
            this.logger.verbose("Claims-based caching is disabled. Clearing the previous cache with claims");
            invoke(this.browserStorage.clearTokensAndKeysWithClaims.bind(this.browserStorage), PerformanceEvents.ClearTokensAndKeysWithClaims, this.logger, this.performanceClient, initCorrelationId)(initCorrelationId);
        }
        this.config.system.asyncPopups &&
            (await this.preGeneratePkceCodes(initCorrelationId));
        this.initialized = true;
        this.eventHandler.emitEvent(EventType.INITIALIZE_END);
        initMeasurement.end({
            allowPlatformBroker: allowPlatformBroker,
            success: true,
        });
    }
    // #region Redirect Flow
    /**
     * Event handler function which allows users to fire events after the PublicClientApplication object
     * has loaded during redirect flows. This should be invoked on all page loads involved in redirect
     * auth flows.
     * @param hash Hash to process. Defaults to the current value of window.location.hash. Only needs to be provided explicitly if the response to be handled is not contained in the current value.
     * @returns Token response or null. If the return value is null, then no auth redirect was detected.
     */
    async handleRedirectPromise(hash) {
        this.logger.verbose("handleRedirectPromise called");
        // Block token acquisition before initialize has been called
        blockAPICallsBeforeInitialize(this.initialized);
        if (this.isBrowserEnvironment) {
            /**
             * Store the promise on the PublicClientApplication instance if this is the first invocation of handleRedirectPromise,
             * otherwise return the promise from the first invocation. Prevents race conditions when handleRedirectPromise is called
             * several times concurrently.
             */
            const redirectResponseKey = hash || "";
            let response = this.redirectResponse.get(redirectResponseKey);
            if (typeof response === "undefined") {
                response = this.handleRedirectPromiseInternal(hash);
                this.redirectResponse.set(redirectResponseKey, response);
                this.logger.verbose("handleRedirectPromise has been called for the first time, storing the promise");
            }
            else {
                this.logger.verbose("handleRedirectPromise has been called previously, returning the result from the first call");
            }
            return response;
        }
        this.logger.verbose("handleRedirectPromise returns null, not browser environment");
        return null;
    }
    /**
     * The internal details of handleRedirectPromise. This is separated out to a helper to allow handleRedirectPromise to memoize requests
     * @param hash
     * @returns
     */
    async handleRedirectPromiseInternal(hash) {
        if (!this.browserStorage.isInteractionInProgress(true)) {
            this.logger.info("handleRedirectPromise called but there is no interaction in progress, returning null.");
            return null;
        }
        const interactionType = this.browserStorage.getInteractionInProgress()?.type;
        if (interactionType === INTERACTION_TYPE.SIGNOUT) {
            this.logger.verbose("handleRedirectPromise removing interaction_in_progress flag and returning null after sign-out");
            this.browserStorage.setInteractionInProgress(false);
            return Promise.resolve(null);
        }
        const loggedInAccounts = this.getAllAccounts();
        const platformBrokerRequest = this.browserStorage.getCachedNativeRequest();
        const useNative = platformBrokerRequest && this.platformAuthProvider && !hash;
        let rootMeasurement;
        this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_START, InteractionType.Redirect);
        let redirectResponse;
        try {
            if (useNative && this.platformAuthProvider) {
                rootMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenRedirect, platformBrokerRequest?.correlationId || "");
                this.logger.trace("handleRedirectPromise - acquiring token from native platform");
                rootMeasurement.add({
                    isPlatformBrokerRequest: true,
                });
                const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.handleRedirectPromise, this.performanceClient, this.platformAuthProvider, platformBrokerRequest.accountId, this.nativeInternalStorage, platformBrokerRequest.correlationId);
                redirectResponse = invokeAsync(nativeClient.handleRedirectPromise.bind(nativeClient), PerformanceEvents.HandleNativeRedirectPromiseMeasurement, this.logger, this.performanceClient, rootMeasurement.event.correlationId)(this.performanceClient, rootMeasurement.event.correlationId);
            }
            else {
                const [standardRequest, codeVerifier] = this.browserStorage.getCachedRequest();
                const correlationId = standardRequest.correlationId;
                // Reset rootMeasurement now that we have correlationId
                rootMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenRedirect, correlationId);
                this.logger.trace("handleRedirectPromise - acquiring token from web flow");
                const redirectClient = this.createRedirectClient(correlationId);
                redirectResponse = invokeAsync(redirectClient.handleRedirectPromise.bind(redirectClient), PerformanceEvents.HandleRedirectPromiseMeasurement, this.logger, this.performanceClient, rootMeasurement.event.correlationId)(hash, standardRequest, codeVerifier, rootMeasurement);
            }
        }
        catch (e) {
            this.browserStorage.resetRequestCache();
            throw e;
        }
        return redirectResponse
            .then((result) => {
            if (result) {
                this.browserStorage.resetRequestCache();
                // Emit login event if number of accounts change
                const isLoggingIn = loggedInAccounts.length < this.getAllAccounts().length;
                if (isLoggingIn) {
                    this.eventHandler.emitEvent(EventType.LOGIN_SUCCESS, InteractionType.Redirect, result);
                    this.logger.verbose("handleRedirectResponse returned result, login success");
                }
                else {
                    this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Redirect, result);
                    this.logger.verbose("handleRedirectResponse returned result, acquire token success");
                }
                rootMeasurement.end({
                    success: true,
                }, undefined, result.account);
            }
            else {
                /*
                 * Instrument an event only if an error code is set. Otherwise, discard it when the redirect response
                 * is empty and the error code is missing.
                 */
                if (rootMeasurement.event.errorCode) {
                    rootMeasurement.end({ success: false }, undefined);
                }
                else {
                    rootMeasurement.discard();
                }
            }
            this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_END, InteractionType.Redirect);
            return result;
        })
            .catch((e) => {
            this.browserStorage.resetRequestCache();
            const eventError = e;
            // Emit login event if there is an account
            if (loggedInAccounts.length > 0) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Redirect, null, eventError);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, InteractionType.Redirect, null, eventError);
            }
            this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_END, InteractionType.Redirect);
            rootMeasurement.end({
                success: false,
            }, eventError);
            throw e;
        });
    }
    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    async acquireTokenRedirect(request) {
        // Preflight request
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("acquireTokenRedirect called", correlationId);
        const atrMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPreRedirect, correlationId);
        atrMeasurement.add({
            scenarioId: request.scenarioId,
        });
        // Override on request only if set, as onRedirectNavigate field is deprecated
        const onRedirectNavigateCb = request.onRedirectNavigate;
        if (onRedirectNavigateCb) {
            request.onRedirectNavigate = (url) => {
                const navigate = typeof onRedirectNavigateCb === "function"
                    ? onRedirectNavigateCb(url)
                    : undefined;
                atrMeasurement.add({
                    navigateCallbackResult: navigate !== false,
                });
                atrMeasurement.event =
                    atrMeasurement.end({ success: true }, undefined, request.account) || atrMeasurement.event;
                return navigate;
            };
        }
        else {
            const configOnRedirectNavigateCb = this.config.auth.onRedirectNavigate;
            this.config.auth.onRedirectNavigate = (url) => {
                const navigate = typeof configOnRedirectNavigateCb === "function"
                    ? configOnRedirectNavigateCb(url)
                    : undefined;
                atrMeasurement.add({
                    navigateCallbackResult: navigate !== false,
                });
                atrMeasurement.event =
                    atrMeasurement.end({ success: true }, undefined, request.account) || atrMeasurement.event;
                return navigate;
            };
        }
        // If logged in, emit acquire token events
        const isLoggedIn = this.getAllAccounts().length > 0;
        try {
            redirectPreflightCheck(this.initialized, this.config);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNIN);
            if (isLoggedIn) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, InteractionType.Redirect, request);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_START, InteractionType.Redirect, request);
            }
            let result;
            if (this.platformAuthProvider &&
                this.canUsePlatformBroker(request)) {
                const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.acquireTokenRedirect, this.performanceClient, this.platformAuthProvider, this.getNativeAccountId(request), this.nativeInternalStorage, correlationId);
                result = nativeClient
                    .acquireTokenRedirect(request, atrMeasurement)
                    .catch((e) => {
                    atrMeasurement.add({
                        brokerErrorName: e.name,
                        brokerErrorCode: e.errorCode,
                    });
                    if (e instanceof NativeAuthError &&
                        isFatalNativeAuthError(e)) {
                        this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt platform broker calls
                        const redirectClient = this.createRedirectClient(correlationId);
                        return redirectClient.acquireToken(request);
                    }
                    else if (e instanceof InteractionRequiredAuthError) {
                        this.logger.verbose("acquireTokenRedirect - Resolving interaction required error thrown by native broker by falling back to web flow");
                        const redirectClient = this.createRedirectClient(correlationId);
                        return redirectClient.acquireToken(request);
                    }
                    throw e;
                });
            }
            else {
                const redirectClient = this.createRedirectClient(correlationId);
                result = redirectClient.acquireToken(request);
            }
            return await result;
        }
        catch (e) {
            this.browserStorage.resetRequestCache();
            /*
             * Pre-redirect event completes before navigation occurs.
             * Timed out navigation needs to be instrumented separately as a post-redirect event.
             */
            if (atrMeasurement.event.status === 2) {
                this.performanceClient
                    .startMeasurement(PerformanceEvents.AcquireTokenRedirect, correlationId)
                    .end({ success: false }, e, request.account);
            }
            else {
                atrMeasurement.end({ success: false }, e, request.account);
            }
            if (isLoggedIn) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Redirect, null, e);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, InteractionType.Redirect, null, e);
            }
            throw e;
        }
    }
    // #endregion
    // #region Popup Flow
    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenPopup(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const atPopupMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPopup, correlationId);
        atPopupMeasurement.add({
            scenarioId: request.scenarioId,
        });
        try {
            this.logger.verbose("acquireTokenPopup called", correlationId);
            preflightCheck(this.initialized, atPopupMeasurement, request.account);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNIN);
        }
        catch (e) {
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        }
        // If logged in, emit acquire token events
        const loggedInAccounts = this.getAllAccounts();
        if (loggedInAccounts.length > 0) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, InteractionType.Popup, request);
        }
        else {
            this.eventHandler.emitEvent(EventType.LOGIN_START, InteractionType.Popup, request);
        }
        let result;
        const pkce = this.getPreGeneratedPkceCodes(correlationId);
        if (this.canUsePlatformBroker(request)) {
            atPopupMeasurement.add({
                isPlatformBrokerRequest: true,
            });
            result = this.acquireTokenNative({
                ...request,
                correlationId,
            }, ApiId.acquireTokenPopup)
                .then((response) => {
                atPopupMeasurement.end({
                    success: true,
                }, undefined, response.account);
                return response;
            })
                .catch((e) => {
                atPopupMeasurement.add({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                });
                if (e instanceof NativeAuthError &&
                    isFatalNativeAuthError(e)) {
                    this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to continuing to attempt platform broker calls
                    const popupClient = this.createPopupClient(correlationId);
                    return popupClient.acquireToken(request, pkce);
                }
                else if (e instanceof InteractionRequiredAuthError) {
                    this.logger.verbose("acquireTokenPopup - Resolving interaction required error thrown by native broker by falling back to web flow");
                    const popupClient = this.createPopupClient(correlationId);
                    return popupClient.acquireToken(request, pkce);
                }
                throw e;
            });
        }
        else {
            const popupClient = this.createPopupClient(correlationId);
            result = popupClient.acquireToken(request, pkce);
        }
        return result
            .then((result) => {
            /*
             *  If logged in, emit acquire token events
             */
            const isLoggingIn = loggedInAccounts.length < this.getAllAccounts().length;
            if (isLoggingIn) {
                this.eventHandler.emitEvent(EventType.LOGIN_SUCCESS, InteractionType.Popup, result);
            }
            else {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Popup, result);
            }
            atPopupMeasurement.end({
                success: true,
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            }, undefined, result.account);
            return result;
        })
            .catch((e) => {
            if (loggedInAccounts.length > 0) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Popup, null, e);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, InteractionType.Popup, null, e);
            }
            atPopupMeasurement.end({
                success: false,
            }, e, request.account);
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        })
            .finally(async () => {
            this.browserStorage.setInteractionInProgress(false);
            if (this.config.system.asyncPopups) {
                await this.preGeneratePkceCodes(correlationId);
            }
        });
    }
    trackPageVisibilityWithMeasurement() {
        const measurement = this.ssoSilentMeasurement ||
            this.acquireTokenByCodeAsyncMeasurement;
        if (!measurement) {
            return;
        }
        this.logger.info("Perf: Visibility change detected in ", measurement.event.name);
        measurement.increment({
            visibilityChangeCount: 1,
        });
    }
    // #endregion
    // #region Silent Flow
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
    async ssoSilent(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const validRequest = {
            ...request,
            // will be PromptValue.NONE or PromptValue.NO_SESSION
            prompt: request.prompt,
            correlationId: correlationId,
        };
        this.ssoSilentMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.SsoSilent, correlationId);
        this.ssoSilentMeasurement?.add({
            scenarioId: request.scenarioId,
        });
        preflightCheck(this.initialized, this.ssoSilentMeasurement, request.account);
        this.ssoSilentMeasurement?.increment({
            visibilityChangeCount: 0,
        });
        document.addEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        this.logger.verbose("ssoSilent called", correlationId);
        this.eventHandler.emitEvent(EventType.SSO_SILENT_START, InteractionType.Silent, validRequest);
        let result;
        if (this.canUsePlatformBroker(validRequest)) {
            this.ssoSilentMeasurement?.add({
                isPlatformBrokerRequest: true,
            });
            result = this.acquireTokenNative(validRequest, ApiId.ssoSilent).catch((e) => {
                this.ssoSilentMeasurement?.add({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                });
                // If native token acquisition fails for availability reasons fallback to standard flow
                if (e instanceof NativeAuthError && isFatalNativeAuthError(e)) {
                    this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt
                    const silentIframeClient = this.createSilentIframeClient(validRequest.correlationId);
                    return silentIframeClient.acquireToken(validRequest);
                }
                throw e;
            });
        }
        else {
            const silentIframeClient = this.createSilentIframeClient(validRequest.correlationId);
            result = silentIframeClient.acquireToken(validRequest);
        }
        return result
            .then((response) => {
            this.eventHandler.emitEvent(EventType.SSO_SILENT_SUCCESS, InteractionType.Silent, response);
            this.ssoSilentMeasurement?.end({
                success: true,
                accessTokenSize: response.accessToken.length,
                idTokenSize: response.idToken.length,
            }, undefined, response.account);
            return response;
        })
            .catch((e) => {
            this.eventHandler.emitEvent(EventType.SSO_SILENT_FAILURE, InteractionType.Silent, null, e);
            this.ssoSilentMeasurement?.end({
                success: false,
            }, e, request.account);
            throw e;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        });
    }
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
    async acquireTokenByCode(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.trace("acquireTokenByCode called", correlationId);
        const atbcMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenByCode, correlationId);
        preflightCheck(this.initialized, atbcMeasurement);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_START, InteractionType.Silent, request);
        atbcMeasurement.add({ scenarioId: request.scenarioId });
        try {
            if (request.code && request.nativeAccountId) {
                // Throw error in case server returns both spa_code and spa_accountid in exchange for auth code.
                throw createBrowserAuthError(spaCodeAndNativeAccountIdPresent);
            }
            else if (request.code) {
                const hybridAuthCode = request.code;
                let response = this.hybridAuthCodeResponses.get(hybridAuthCode);
                if (!response) {
                    this.logger.verbose("Initiating new acquireTokenByCode request", correlationId);
                    response = this.acquireTokenByCodeAsync({
                        ...request,
                        correlationId,
                    })
                        .then((result) => {
                        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_SUCCESS, InteractionType.Silent, result);
                        this.hybridAuthCodeResponses.delete(hybridAuthCode);
                        atbcMeasurement.end({
                            success: true,
                            accessTokenSize: result.accessToken.length,
                            idTokenSize: result.idToken.length,
                        }, undefined, result.account);
                        return result;
                    })
                        .catch((error) => {
                        this.hybridAuthCodeResponses.delete(hybridAuthCode);
                        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_FAILURE, InteractionType.Silent, null, error);
                        atbcMeasurement.end({
                            success: false,
                        }, error);
                        throw error;
                    });
                    this.hybridAuthCodeResponses.set(hybridAuthCode, response);
                }
                else {
                    this.logger.verbose("Existing acquireTokenByCode request found", correlationId);
                    atbcMeasurement.discard();
                }
                return await response;
            }
            else if (request.nativeAccountId) {
                if (this.canUsePlatformBroker(request, request.nativeAccountId)) {
                    atbcMeasurement.add({
                        isPlatformBrokerRequest: true,
                    });
                    const result = await this.acquireTokenNative({
                        ...request,
                        correlationId,
                    }, ApiId.acquireTokenByCode, request.nativeAccountId).catch((e) => {
                        // If native token acquisition fails for availability reasons fallback to standard flow
                        if (e instanceof NativeAuthError &&
                            isFatalNativeAuthError(e)) {
                            this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt
                        }
                        atbcMeasurement.add({
                            brokerErrorName: e.name,
                            brokerErrorCode: e.errorCode,
                        });
                        throw e;
                    });
                    atbcMeasurement.end({
                        success: true,
                    }, undefined, result.account);
                    return result;
                }
                else {
                    throw createBrowserAuthError(unableToAcquireTokenFromNativePlatform);
                }
            }
            else {
                throw createBrowserAuthError(authCodeOrNativeAccountIdRequired);
            }
        }
        catch (e) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_FAILURE, InteractionType.Silent, null, e);
            atbcMeasurement.end({
                success: false,
            }, e);
            throw e;
        }
    }
    /**
     * Creates a SilentAuthCodeClient to redeem an authorization code.
     * @param request
     * @returns Result of the operation to redeem the authorization code
     */
    async acquireTokenByCodeAsync(request) {
        this.logger.trace("acquireTokenByCodeAsync called", request.correlationId);
        this.acquireTokenByCodeAsyncMeasurement =
            this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenByCodeAsync, request.correlationId);
        this.acquireTokenByCodeAsyncMeasurement?.increment({
            visibilityChangeCount: 0,
        });
        document.addEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        const silentAuthCodeClient = this.createSilentAuthCodeClient(request.correlationId);
        const silentTokenResult = await silentAuthCodeClient
            .acquireToken(request)
            .then((response) => {
            this.acquireTokenByCodeAsyncMeasurement?.end({
                success: true,
                fromCache: response.fromCache,
            });
            return response;
        })
            .catch((tokenRenewalError) => {
            this.acquireTokenByCodeAsyncMeasurement?.end({
                success: false,
            }, tokenRenewalError);
            throw tokenRenewalError;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        });
        return silentTokenResult;
    }
    /**
     * Attempt to acquire an access token from the cache
     * @param silentCacheClient SilentCacheClient
     * @param commonRequest CommonSilentFlowRequest
     * @param silentRequest SilentRequest
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenFromCache(commonRequest, cacheLookupPolicy) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenFromCache, commonRequest.correlationId);
        switch (cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessToken:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
                const silentCacheClient = this.createSilentCacheClient(commonRequest.correlationId);
                return invokeAsync(silentCacheClient.acquireToken.bind(silentCacheClient), PerformanceEvents.SilentCacheClientAcquireToken, this.logger, this.performanceClient, commonRequest.correlationId)(commonRequest);
            default:
                throw createClientAuthError(ClientAuthErrorCodes.tokenRefreshRequired);
        }
    }
    /**
     * Attempt to acquire an access token via a refresh token
     * @param commonRequest CommonSilentFlowRequest
     * @param cacheLookupPolicy CacheLookupPolicy
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenByRefreshToken(commonRequest, cacheLookupPolicy) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenByRefreshToken, commonRequest.correlationId);
        switch (cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
            case CacheLookupPolicy.RefreshToken:
            case CacheLookupPolicy.RefreshTokenAndNetwork:
                const silentRefreshClient = this.createSilentRefreshClient(commonRequest.correlationId);
                return invokeAsync(silentRefreshClient.acquireToken.bind(silentRefreshClient), PerformanceEvents.SilentRefreshClientAcquireToken, this.logger, this.performanceClient, commonRequest.correlationId)(commonRequest);
            default:
                throw createClientAuthError(ClientAuthErrorCodes.tokenRefreshRequired);
        }
    }
    /**
     * Attempt to acquire an access token via an iframe
     * @param request CommonSilentFlowRequest
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenBySilentIframe(request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenBySilentIframe, request.correlationId);
        const silentIframeClient = this.createSilentIframeClient(request.correlationId);
        return invokeAsync(silentIframeClient.acquireToken.bind(silentIframeClient), PerformanceEvents.SilentIframeClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(request);
    }
    // #endregion
    // #region Logout
    /**
     * Deprecated logout function. Use logoutRedirect or logoutPopup instead
     * @param logoutRequest
     * @deprecated
     */
    async logout(logoutRequest) {
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        this.logger.warning("logout API is deprecated and will be removed in msal-browser v3.0.0. Use logoutRedirect instead.", correlationId);
        return this.logoutRedirect({
            correlationId,
            ...logoutRequest,
        });
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    async logoutRedirect(logoutRequest) {
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        redirectPreflightCheck(this.initialized, this.config);
        this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
        const redirectClient = this.createRedirectClient(correlationId);
        return redirectClient.logout(logoutRequest);
    }
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logoutPopup(logoutRequest) {
        try {
            const correlationId = this.getRequestCorrelationId(logoutRequest);
            preflightCheck$1(this.initialized);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
            const popupClient = this.createPopupClient(correlationId);
            return popupClient.logout(logoutRequest).finally(() => {
                this.browserStorage.setInteractionInProgress(false);
            });
        }
        catch (e) {
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        }
    }
    /**
     * Creates a cache interaction client to clear broswer cache.
     * @param logoutRequest
     */
    async clearCache(logoutRequest) {
        if (!this.isBrowserEnvironment) {
            this.logger.info("in non-browser environment, returning early.");
            return;
        }
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        const cacheClient = this.createSilentCacheClient(correlationId);
        return cacheClient.logout(logoutRequest);
    }
    // #endregion
    // #region Account APIs
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        const correlationId = this.getRequestCorrelationId();
        return getAllAccounts(this.logger, this.browserStorage, this.isBrowserEnvironment, correlationId, accountFilter);
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        const correlationId = this.getRequestCorrelationId();
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
        const correlationId = this.getRequestCorrelationId();
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
        const correlationId = this.getRequestCorrelationId();
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
        const correlationId = this.getRequestCorrelationId();
        return getAccountByLocalId(localAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        const correlationId = this.getRequestCorrelationId();
        setActiveAccount(account, this.browserStorage, correlationId);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        const correlationId = this.getRequestCorrelationId();
        return getActiveAccount(this.browserStorage, correlationId);
    }
    // #endregion
    /**
     * Hydrates the cache with the tokens from an AuthenticationResult
     * @param result
     * @param request
     * @returns
     */
    async hydrateCache(result, request) {
        this.logger.verbose("hydrateCache called");
        // Account gets saved to browser storage regardless of native or not
        const accountEntity = AccountEntity.createFromAccountInfo(result.account, result.cloudGraphHostName, result.msGraphHost);
        await this.browserStorage.setAccount(accountEntity, result.correlationId, AuthToken.isKmsi(result.idTokenClaims));
        if (result.fromNativeBroker) {
            this.logger.verbose("Response was from native broker, storing in-memory");
            // Tokens from native broker are stored in-memory
            return this.nativeInternalStorage.hydrateCache(result, request);
        }
        else {
            return this.browserStorage.hydrateCache(result, request);
        }
    }
    // #region Helpers
    /**
     * Acquire a token from native device (e.g. WAM)
     * @param request
     */
    async acquireTokenNative(request, apiId, accountId, cacheLookupPolicy) {
        this.logger.trace("acquireTokenNative called");
        if (!this.platformAuthProvider) {
            throw createBrowserAuthError(nativeConnectionNotEstablished);
        }
        const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, apiId, this.performanceClient, this.platformAuthProvider, accountId || this.getNativeAccountId(request), this.nativeInternalStorage, request.correlationId);
        return nativeClient.acquireToken(request, cacheLookupPolicy);
    }
    /**
     * Returns boolean indicating if this request can use the platform broker
     * @param request
     */
    canUsePlatformBroker(request, accountId) {
        this.logger.trace("canUsePlatformBroker called");
        if (!this.platformAuthProvider) {
            this.logger.trace("canUsePlatformBroker: platform broker unavilable, returning false");
            return false;
        }
        if (!isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, request.authenticationScheme)) {
            this.logger.trace("canUsePlatformBroker: isBrokerAvailable returned false, returning false");
            return false;
        }
        if (request.prompt) {
            switch (request.prompt) {
                case PromptValue.NONE:
                case PromptValue.CONSENT:
                case PromptValue.LOGIN:
                case PromptValue.SELECT_ACCOUNT:
                    this.logger.trace("canUsePlatformBroker: prompt is compatible with platform broker flow");
                    break;
                default:
                    this.logger.trace(`canUsePlatformBroker: prompt = ${request.prompt} is not compatible with platform broker flow, returning false`);
                    return false;
            }
        }
        if (!accountId && !this.getNativeAccountId(request)) {
            this.logger.trace("canUsePlatformBroker: nativeAccountId is not available, returning false");
            return false;
        }
        return true;
    }
    /**
     * Get the native accountId from the account
     * @param request
     * @returns
     */
    getNativeAccountId(request) {
        const account = request.account ||
            this.getAccount({
                loginHint: request.loginHint,
                sid: request.sid,
            }) ||
            this.getActiveAccount();
        return (account && account.nativeAccountId) || "";
    }
    /**
     * Returns new instance of the Popup Interaction Client
     * @param correlationId
     */
    createPopupClient(correlationId) {
        return new PopupClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Redirect Interaction Client
     * @param correlationId
     */
    createRedirectClient(correlationId) {
        return new RedirectClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Iframe Interaction Client
     * @param correlationId
     */
    createSilentIframeClient(correlationId) {
        return new SilentIframeClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.ssoSilent, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Cache Interaction Client
     */
    createSilentCacheClient(correlationId) {
        return new SilentCacheClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Refresh Interaction Client
     */
    createSilentRefreshClient(correlationId) {
        return new SilentRefreshClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent AuthCode Interaction Client
     */
    createSilentAuthCodeClient(correlationId) {
        return new SilentAuthCodeClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.acquireTokenByCode, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Adds event callbacks to array
     * @param callback
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
    /**
     * Registers a callback to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback) {
        blockNonBrowserEnvironment();
        return this.performanceClient.addPerformanceCallback(callback);
    }
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId) {
        return this.performanceClient.removePerformanceCallback(callbackId);
    }
    /**
     * Adds event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    enableAccountStorageEvents() {
        if (this.config.cache.cacheLocation !==
            BrowserCacheLocation.LocalStorage) {
            this.logger.info("Account storage events are only available when cacheLocation is set to localStorage");
            return;
        }
        this.eventHandler.subscribeCrossTab();
    }
    /**
     * Removes event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    disableAccountStorageEvents() {
        if (this.config.cache.cacheLocation !==
            BrowserCacheLocation.LocalStorage) {
            this.logger.info("Account storage events are only available when cacheLocation is set to localStorage");
            return;
        }
        this.eventHandler.unsubscribeCrossTab();
    }
    /**
     * Gets the token cache for the application.
     */
    getTokenCache() {
        return this.tokenCache;
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
    /**
     * Called by wrapper libraries (Angular & React) to set SKU and Version passed down to telemetry, logger, etc.
     * @param sku
     * @param version
     */
    initializeWrapperLibrary(sku, version) {
        // Validate the SKU passed in is one we expect
        this.browserStorage.setWrapperMetadata(sku, version);
    }
    /**
     * Sets navigation client
     * @param navigationClient
     */
    setNavigationClient(navigationClient) {
        this.navigationClient = navigationClient;
    }
    /**
     * Returns the configuration object
     */
    getConfiguration() {
        return this.config;
    }
    /**
     * Returns the performance client
     */
    getPerformanceClient() {
        return this.performanceClient;
    }
    /**
     * Returns the browser env indicator
     */
    isBrowserEnv() {
        return this.isBrowserEnvironment;
    }
    /**
     * Generates a correlation id for a request if none is provided.
     *
     * @protected
     * @param {?Partial<BaseAuthRequest>} [request]
     * @returns {string}
     */
    getRequestCorrelationId(request) {
        if (request?.correlationId) {
            return request.correlationId;
        }
        if (this.isBrowserEnvironment) {
            return createNewGuid();
        }
        /*
         * Included for fallback for non-browser environments,
         * and to ensure this method always returns a string.
         */
        return Constants.EMPTY_STRING;
    }
    // #endregion
    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    async loginRedirect(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("loginRedirect called", correlationId);
        return this.acquireTokenRedirect({
            correlationId,
            ...(request || DEFAULT_REQUEST),
        });
    }
    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    loginPopup(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("loginPopup called", correlationId);
        return this.acquireTokenPopup({
            correlationId,
            ...(request || DEFAULT_REQUEST),
        });
    }
    /**
     * Silently acquire an access token for a given set of scopes. Returns currently processing promise if parallel requests are made.
     *
     * @param {@link (SilentRequest:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse} object
     */
    async acquireTokenSilent(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const atsMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenSilent, correlationId);
        atsMeasurement.add({
            cacheLookupPolicy: request.cacheLookupPolicy,
            scenarioId: request.scenarioId,
        });
        preflightCheck(this.initialized, atsMeasurement, request.account);
        this.logger.verbose("acquireTokenSilent called", correlationId);
        const account = request.account || this.getActiveAccount();
        if (!account) {
            throw createBrowserAuthError(noAccountError);
        }
        return this.acquireTokenSilentDeduped(request, account, correlationId)
            .then((result) => {
            atsMeasurement.end({
                success: true,
                fromCache: result.fromCache,
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            }, undefined, result.account);
            return {
                ...result,
                state: request.state,
                correlationId: correlationId, // Ensures PWB scenarios can correctly match request to response
            };
        })
            .catch((error) => {
            if (error instanceof AuthError) {
                // Ensures PWB scenarios can correctly match request to response
                error.setCorrelationId(correlationId);
            }
            atsMeasurement.end({
                success: false,
            }, error, account);
            throw error;
        });
    }
    /**
     * Checks if identical request is already in flight and returns reference to the existing promise or fires off a new one if this is the first
     * @param request
     * @param account
     * @param correlationId
     * @returns
     */
    async acquireTokenSilentDeduped(request, account, correlationId) {
        const thumbprint = getRequestThumbprint(this.config.auth.clientId, {
            ...request,
            authority: request.authority || this.config.auth.authority,
            correlationId: correlationId,
        }, account.homeAccountId);
        const silentRequestKey = JSON.stringify(thumbprint);
        const inProgressRequest = this.activeSilentTokenRequests.get(silentRequestKey);
        if (typeof inProgressRequest === "undefined") {
            this.logger.verbose("acquireTokenSilent called for the first time, storing active request", correlationId);
            this.performanceClient.addFields({ deduped: false }, correlationId);
            const activeRequest = invokeAsync(this.acquireTokenSilentAsync.bind(this), PerformanceEvents.AcquireTokenSilentAsync, this.logger, this.performanceClient, correlationId)({
                ...request,
                correlationId,
            }, account);
            this.activeSilentTokenRequests.set(silentRequestKey, activeRequest);
            return activeRequest.finally(() => {
                this.activeSilentTokenRequests.delete(silentRequestKey);
            });
        }
        else {
            this.logger.verbose("acquireTokenSilent has been called previously, returning the result from the first call", correlationId);
            this.performanceClient.addFields({ deduped: true }, correlationId);
            return inProgressRequest;
        }
    }
    /**
     * Silently acquire an access token for a given set of scopes. Will use cached token if available, otherwise will attempt to acquire a new token from the network via refresh token.
     * @param {@link (SilentRequest:type)}
     * @param {@link (AccountInfo:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse}
     */
    async acquireTokenSilentAsync(request, account) {
        const trackPageVisibility = () => this.trackPageVisibility(request.correlationId);
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenSilentAsync, request.correlationId);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, InteractionType.Silent, request);
        if (request.correlationId) {
            this.performanceClient.incrementFields({ visibilityChangeCount: 0 }, request.correlationId);
        }
        document.addEventListener("visibilitychange", trackPageVisibility);
        const silentRequest = await invokeAsync(initializeSilentRequest, PerformanceEvents.InitializeSilentRequest, this.logger, this.performanceClient, request.correlationId)(request, account, this.config, this.performanceClient, this.logger);
        const cacheLookupPolicy = request.cacheLookupPolicy || CacheLookupPolicy.Default;
        const result = this.acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy).catch(async (refreshTokenError) => {
            const shouldTryToResolveSilently = checkIfRefreshTokenErrorCanBeResolvedSilently(refreshTokenError, cacheLookupPolicy);
            if (shouldTryToResolveSilently) {
                if (!this.activeIframeRequest) {
                    let _resolve;
                    // Always set the active request tracker immediately after checking it to prevent races
                    this.activeIframeRequest = [
                        new Promise((resolve) => {
                            _resolve = resolve;
                        }),
                        silentRequest.correlationId,
                    ];
                    this.logger.verbose("Refresh token expired/invalid or CacheLookupPolicy is set to Skip, attempting acquire token by iframe.", silentRequest.correlationId);
                    return invokeAsync(this.acquireTokenBySilentIframe.bind(this), PerformanceEvents.AcquireTokenBySilentIframe, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest)
                        .then((iframeResult) => {
                        _resolve(true);
                        return iframeResult;
                    })
                        .catch((e) => {
                        _resolve(false);
                        throw e;
                    })
                        .finally(() => {
                        this.activeIframeRequest = undefined;
                    });
                }
                else if (cacheLookupPolicy !== CacheLookupPolicy.Skip) {
                    const [activePromise, activeCorrelationId] = this.activeIframeRequest;
                    this.logger.verbose(`Iframe request is already in progress, awaiting resolution for request with correlationId: ${activeCorrelationId}`, silentRequest.correlationId);
                    const awaitConcurrentIframeMeasure = this.performanceClient.startMeasurement(PerformanceEvents.AwaitConcurrentIframe, silentRequest.correlationId);
                    awaitConcurrentIframeMeasure.add({
                        awaitIframeCorrelationId: activeCorrelationId,
                    });
                    const activePromiseResult = await activePromise;
                    awaitConcurrentIframeMeasure.end({
                        success: activePromiseResult,
                    });
                    if (activePromiseResult) {
                        this.logger.verbose(`Parallel iframe request with correlationId: ${activeCorrelationId} succeeded. Retrying cache and/or RT redemption`, silentRequest.correlationId);
                        // Retry cache lookup and/or RT exchange after iframe completes
                        return this.acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy);
                    }
                    else {
                        this.logger.info(`Iframe request with correlationId: ${activeCorrelationId} failed. Interaction is required.`);
                        // If previous iframe request failed, it's unlikely to succeed this time. Throw original error.
                        throw refreshTokenError;
                    }
                }
                else {
                    // Cache policy set to skip and another iframe request is already in progress
                    this.logger.warning("Another iframe request is currently in progress and CacheLookupPolicy is set to Skip. This may result in degraded performance and/or reliability for both calls. Please consider changing the CacheLookupPolicy to take advantage of request queuing and token cache.", silentRequest.correlationId);
                    return invokeAsync(this.acquireTokenBySilentIframe.bind(this), PerformanceEvents.AcquireTokenBySilentIframe, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest);
                }
            }
            else {
                // Error cannot be silently resolved or iframe renewal is not allowed, interaction required
                throw refreshTokenError;
            }
        });
        return result
            .then((response) => {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, InteractionType.Silent, response);
            this.performanceClient.addFields({
                fromCache: response.fromCache,
            }, request.correlationId);
            return response;
        })
            .catch((tokenRenewalError) => {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, InteractionType.Silent, null, tokenRenewalError);
            throw tokenRenewalError;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", trackPageVisibility);
        });
    }
    /**
     * AcquireTokenSilent without the iframe fallback. This is used to enable the correct fallbacks in cases where there's a potential for multiple silent requests to be made in parallel and prevent those requests from making concurrent iframe requests.
     * @param silentRequest
     * @param cacheLookupPolicy
     * @returns
     */
    async acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy) {
        // if the cache policy is set to access_token only, we should not be hitting the native layer yet
        if (isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, silentRequest.authenticationScheme) &&
            silentRequest.account.nativeAccountId) {
            this.logger.verbose("acquireTokenSilent - attempting to acquire token from native platform");
            this.performanceClient.addFields({ isPlatformBrokerRequest: true }, silentRequest.correlationId);
            return this.acquireTokenNative(silentRequest, ApiId.acquireTokenSilent_silentFlow, silentRequest.account.nativeAccountId, cacheLookupPolicy).catch(async (e) => {
                this.performanceClient.addFields({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                }, silentRequest.correlationId);
                // If native token acquisition fails for availability reasons fallback to web flow
                if (e instanceof NativeAuthError && isFatalNativeAuthError(e)) {
                    this.logger.verbose("acquireTokenSilent - native platform unavailable, falling back to web flow");
                    this.platformAuthProvider = undefined; // Prevent future requests from continuing to attempt
                    // Cache will not contain tokens, given that previous WAM requests succeeded. Skip cache and RT renewal and go straight to iframe renewal
                    throw createClientAuthError(ClientAuthErrorCodes.tokenRefreshRequired);
                }
                throw e;
            });
        }
        else {
            this.logger.verbose("acquireTokenSilent - attempting to acquire token from web flow");
            // add logs to identify embedded cache retrieval
            if (cacheLookupPolicy === CacheLookupPolicy.AccessToken) {
                this.logger.verbose("acquireTokenSilent - cache lookup policy set to AccessToken, attempting to acquire token from local cache");
            }
            return invokeAsync(this.acquireTokenFromCache.bind(this), PerformanceEvents.AcquireTokenFromCache, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest, cacheLookupPolicy).catch((cacheError) => {
                if (cacheLookupPolicy === CacheLookupPolicy.AccessToken) {
                    throw cacheError;
                }
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_NETWORK_START, InteractionType.Silent, silentRequest);
                return invokeAsync(this.acquireTokenByRefreshToken.bind(this), PerformanceEvents.AcquireTokenByRefreshToken, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest, cacheLookupPolicy);
            });
        }
    }
    /**
     * Pre-generates PKCE codes and stores it in local variable
     * @param correlationId
     */
    async preGeneratePkceCodes(correlationId) {
        this.logger.verbose("Generating new PKCE codes");
        this.pkceCode = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        return Promise.resolve();
    }
    /**
     * Provides pre-generated PKCE codes, if any
     * @param correlationId
     */
    getPreGeneratedPkceCodes(correlationId) {
        this.logger.verbose("Attempting to pick up pre-generated PKCE codes");
        const res = this.pkceCode ? { ...this.pkceCode } : undefined;
        this.pkceCode = undefined;
        this.logger.verbose(`${res ? "Found" : "Did not find"} pre-generated PKCE codes`);
        this.performanceClient.addFields({ usePreGeneratedPkce: !!res }, correlationId);
        return res;
    }
    logMultipleInstances(performanceEvent) {
        const clientId = this.config.auth.clientId;
        if (!window)
            return;
        // @ts-ignore
        window.msal = window.msal || {};
        // @ts-ignore
        window.msal.clientIds = window.msal.clientIds || [];
        // @ts-ignore
        const clientIds = window.msal.clientIds;
        if (clientIds.length > 0) {
            this.logger.verbose("There is already an instance of MSAL.js in the window.");
        }
        // @ts-ignore
        window.msal.clientIds.push(clientId);
        collectInstanceStats(clientId, performanceEvent, this.logger);
    }
}
/**
 * Determines whether an error thrown by the refresh token endpoint can be resolved without interaction
 * @param refreshTokenError
 * @param silentRequest
 * @param cacheLookupPolicy
 * @returns
 */
function checkIfRefreshTokenErrorCanBeResolvedSilently(refreshTokenError, cacheLookupPolicy) {
    const noInteractionRequired = !(refreshTokenError instanceof InteractionRequiredAuthError &&
        // For refresh token errors, bad_token does not always require interaction (silently resolvable)
        refreshTokenError.subError !==
            InteractionRequiredAuthErrorCodes.badToken);
    // Errors that result when the refresh token needs to be replaced
    const refreshTokenRefreshRequired = refreshTokenError.errorCode === BrowserConstants.INVALID_GRANT_ERROR ||
        refreshTokenError.errorCode ===
            ClientAuthErrorCodes.tokenRefreshRequired;
    // Errors that may be resolved before falling back to interaction (through iframe renewal)
    const isSilentlyResolvable = (noInteractionRequired && refreshTokenRefreshRequired) ||
        refreshTokenError.errorCode ===
            InteractionRequiredAuthErrorCodes.noTokensFound ||
        refreshTokenError.errorCode ===
            InteractionRequiredAuthErrorCodes.refreshTokenExpired;
    // Only these policies allow for an iframe renewal attempt
    const tryIframeRenewal = iFrameRenewalPolicies.includes(cacheLookupPolicy);
    return isSilentlyResolvable && tryIframeRenewal;
}

export { StandardController };
//# sourceMappingURL=StandardController.mjs.map
