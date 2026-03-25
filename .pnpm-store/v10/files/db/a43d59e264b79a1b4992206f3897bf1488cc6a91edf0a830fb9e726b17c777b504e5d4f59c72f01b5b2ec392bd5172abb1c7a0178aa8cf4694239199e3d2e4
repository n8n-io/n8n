/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { invokeAsync, PerformanceEvents, ProtocolMode, AuthError, HttpMethod, Constants, UrlUtils, UrlString, ServerResponseType } from '@azure/msal-common/browser';
import { StandardInteractionClient } from './StandardInteractionClient.mjs';
import { InteractionType, TemporaryCacheKeys, ApiId, INTERACTION_TYPE } from '../utils/BrowserConstants.mjs';
import { replaceHash, isInIframe, getHomepage, clearHash, getCurrentUri } from '../utils/BrowserUtils.mjs';
import { EventType } from '../event/EventType.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { validateInteractionType } from '../response/ResponseHandler.mjs';
import { getAuthCodeRequestUrl, getEARForm, getCodeForm, handleResponseEAR, handleResponseCode } from '../protocol/Authorize.mjs';
import { generatePkceCodes } from '../crypto/PkceGenerator.mjs';
import { isPlatformAuthAllowed } from '../broker/nativeBroker/PlatformAuthProvider.mjs';
import { generateEarKey } from '../crypto/BrowserCrypto.mjs';
import { timedOut, noStateInHash, emptyNavigateUri } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function getNavigationType() {
    if (typeof window === "undefined" ||
        typeof window.performance === "undefined" ||
        typeof window.performance.getEntriesByType !== "function") {
        return undefined;
    }
    const navigationEntries = window.performance.getEntriesByType("navigation");
    const navigation = navigationEntries.length
        ? navigationEntries[0]
        : undefined;
    return navigation?.type;
}
class RedirectClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, nativeStorageImpl, platformAuthHandler, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthHandler, correlationId);
        this.nativeStorage = nativeStorageImpl;
    }
    /**
     * Redirects the page to the /authorize endpoint of the IDP
     * @param request
     */
    async acquireToken(request) {
        const validRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, this.correlationId)(request, InteractionType.Redirect);
        validRequest.platformBroker = isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, request.authenticationScheme);
        const handleBackButton = (event) => {
            // Clear temporary cache if the back button is clicked during the redirect flow.
            if (event.persisted) {
                this.logger.verbose("Page was restored from back/forward cache. Clearing temporary cache.");
                this.browserStorage.resetRequestCache();
                this.eventHandler.emitEvent(EventType.RESTORE_FROM_BFCACHE, InteractionType.Redirect);
            }
        };
        const redirectStartPage = this.getRedirectStartPage(request.redirectStartPage);
        this.logger.verbosePii(`Redirect start page: ${redirectStartPage}`);
        // Cache start page, returns to this page after redirectUri if navigateToLoginRequestUrl is true
        this.browserStorage.setTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, redirectStartPage, true);
        // Clear temporary cache if the back button is clicked during the redirect flow.
        window.addEventListener("pageshow", handleBackButton);
        try {
            if (this.config.auth.protocolMode === ProtocolMode.EAR) {
                await this.executeEarFlow(validRequest);
            }
            else {
                await this.executeCodeFlow(validRequest, request.onRedirectNavigate);
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
            }
            window.removeEventListener("pageshow", handleBackButton);
            throw e;
        }
    }
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @returns
     */
    async executeCodeFlow(request, onRedirectNavigate) {
        const correlationId = request.correlationId;
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenRedirect);
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const redirectRequest = {
            ...request,
            codeChallenge: pkceCodes.challenge,
        };
        this.browserStorage.cacheAuthorizeRequest(redirectRequest, pkceCodes.verifier);
        try {
            if (redirectRequest.httpMethod === HttpMethod.POST) {
                return await this.executeCodeFlowWithPost(redirectRequest);
            }
            else {
                // Initialize the client
                const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({
                    serverTelemetryManager,
                    requestAuthority: redirectRequest.authority,
                    requestAzureCloudOptions: redirectRequest.azureCloudOptions,
                    requestExtraQueryParameters: redirectRequest.extraQueryParameters,
                    account: redirectRequest.account,
                });
                // Create acquire token url.
                const navigateUrl = await invokeAsync(getAuthCodeRequestUrl, PerformanceEvents.GetAuthCodeUrl, this.logger, this.performanceClient, request.correlationId)(this.config, authClient.authority, redirectRequest, this.logger, this.performanceClient);
                // Show the UI once the url has been created. Response will come back in the hash, which will be handled in the handleRedirectCallback function.
                return await this.initiateAuthRequest(navigateUrl, onRedirectNavigate);
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(request) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        const earJwk = await invokeAsync(generateEarKey, PerformanceEvents.GenerateEarKey, this.logger, this.performanceClient, correlationId)();
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const redirectRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkceCodes.challenge,
        };
        this.browserStorage.cacheAuthorizeRequest(redirectRequest, pkceCodes.verifier);
        const form = await getEARForm(document, this.config, discoveredAuthority, redirectRequest, this.logger, this.performanceClient);
        form.submit();
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, this.config.system.redirectNavigationTimeout);
        });
    }
    /**
     * Executes classic Authorization Code flow with a POST request.
     * @param request
     */
    async executeCodeFlowWithPost(request) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        this.browserStorage.cacheAuthorizeRequest(request);
        const form = await getCodeForm(document, this.config, discoveredAuthority, request, this.logger, this.performanceClient);
        form.submit();
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, this.config.system.redirectNavigationTimeout);
        });
    }
    /**
     * Checks if navigateToLoginRequestUrl is set, and:
     * - if true, performs logic to cache and navigate
     * - if false, handles hash string and parses response
     * @param hash {string} url hash
     * @param parentMeasurement {InProgressPerformanceEvent} parent measurement
     */
    async handleRedirectPromise(hash = "", request, pkceVerifier, parentMeasurement) {
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.handleRedirectPromise);
        try {
            const [serverParams, responseString] = this.getRedirectResponse(hash || "");
            if (!serverParams) {
                // Not a recognized server response hash or hash not associated with a redirect request
                this.logger.info("handleRedirectPromise did not detect a response as a result of a redirect. Cleaning temporary cache.");
                this.browserStorage.resetRequestCache();
                // Do not instrument "no_server_response" if user clicked back button
                if (getNavigationType() !== "back_forward") {
                    parentMeasurement.event.errorCode = "no_server_response";
                }
                else {
                    this.logger.verbose("Back navigation event detected. Muting no_server_response error");
                }
                return null;
            }
            // If navigateToLoginRequestUrl is true, get the url where the redirect request was initiated
            const loginRequestUrl = this.browserStorage.getTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, true) || Constants.EMPTY_STRING;
            const loginRequestUrlNormalized = UrlUtils.normalizeUrlForComparison(loginRequestUrl);
            const currentUrlNormalized = UrlUtils.normalizeUrlForComparison(window.location.href);
            if (loginRequestUrlNormalized === currentUrlNormalized &&
                this.config.auth.navigateToLoginRequestUrl) {
                // We are on the page we need to navigate to - handle hash
                this.logger.verbose("Current page is loginRequestUrl, handling response");
                if (loginRequestUrl.indexOf("#") > -1) {
                    // Replace current hash with non-msal hash, if present
                    replaceHash(loginRequestUrl);
                }
                const handleHashResult = await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
                return handleHashResult;
            }
            else if (!this.config.auth.navigateToLoginRequestUrl) {
                this.logger.verbose("NavigateToLoginRequestUrl set to false, handling response");
                return await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
            }
            else if (!isInIframe() ||
                this.config.system.allowRedirectInIframe) {
                /*
                 * Returned from authority using redirect - need to perform navigation before processing response
                 * Cache the hash to be retrieved after the next redirect
                 */
                this.browserStorage.setTemporaryCache(TemporaryCacheKeys.URL_HASH, responseString, true);
                const navigationOptions = {
                    apiId: ApiId.handleRedirectPromise,
                    timeout: this.config.system.redirectNavigationTimeout,
                    noHistory: true,
                };
                /**
                 * Default behavior is to redirect to the start page and not process the hash now.
                 * The start page is expected to also call handleRedirectPromise which will process the hash in one of the checks above.
                 */
                let processHashOnRedirect = true;
                if (!loginRequestUrl || loginRequestUrl === "null") {
                    // Redirect to home page if login request url is null (real null or the string null)
                    const homepage = getHomepage();
                    // Cache the homepage under ORIGIN_URI to ensure cached hash is processed on homepage
                    this.browserStorage.setTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, homepage, true);
                    this.logger.warning("Unable to get valid login request url from cache, redirecting to home page");
                    processHashOnRedirect =
                        await this.navigationClient.navigateInternal(homepage, navigationOptions);
                }
                else {
                    // Navigate to page that initiated the redirect request
                    this.logger.verbose(`Navigating to loginRequestUrl: ${loginRequestUrl}`);
                    processHashOnRedirect =
                        await this.navigationClient.navigateInternal(loginRequestUrl, navigationOptions);
                }
                // If navigateInternal implementation returns false, handle the hash now
                if (!processHashOnRedirect) {
                    return await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
                }
            }
            return null;
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Gets the response hash for a redirect request
     * Returns null if interactionType in the state value is not "redirect" or the hash does not contain known properties
     * @param hash
     */
    getRedirectResponse(userProvidedResponse) {
        this.logger.verbose("getRedirectResponseHash called");
        // Get current location hash from window or cache.
        let responseString = userProvidedResponse;
        if (!responseString) {
            if (this.config.auth.OIDCOptions.serverResponseType ===
                ServerResponseType.QUERY) {
                responseString = window.location.search;
            }
            else {
                responseString = window.location.hash;
            }
        }
        let response = UrlUtils.getDeserializedResponse(responseString);
        if (response) {
            try {
                validateInteractionType(response, this.browserCrypto, InteractionType.Redirect);
            }
            catch (e) {
                if (e instanceof AuthError) {
                    this.logger.error(`Interaction type validation failed due to ${e.errorCode}: ${e.errorMessage}`);
                }
                return [null, ""];
            }
            clearHash(window);
            this.logger.verbose("Hash contains known properties, returning response hash");
            return [response, responseString];
        }
        const cachedHash = this.browserStorage.getTemporaryCache(TemporaryCacheKeys.URL_HASH, true);
        this.browserStorage.removeItem(this.browserStorage.generateCacheKey(TemporaryCacheKeys.URL_HASH));
        if (cachedHash) {
            response = UrlUtils.getDeserializedResponse(cachedHash);
            if (response) {
                this.logger.verbose("Hash does not contain known properties, returning cached hash");
                return [response, cachedHash];
            }
        }
        return [null, ""];
    }
    /**
     * Checks if hash exists and handles in window.
     * @param hash
     * @param state
     */
    async handleResponse(serverParams, request, codeVerifier, serverTelemetryManager) {
        const state = serverParams.state;
        if (!state) {
            throw createBrowserAuthError(noStateInHash);
        }
        if (serverParams.ear_jwe) {
            const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, request.correlationId)({
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
            });
            return invokeAsync(handleResponseEAR, PerformanceEvents.HandleResponseEar, this.logger, this.performanceClient, request.correlationId)(request, serverParams, ApiId.acquireTokenRedirect, this.config, discoveredAuthority, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
        const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({ serverTelemetryManager, requestAuthority: request.authority });
        return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, request.correlationId)(request, serverParams, codeVerifier, ApiId.acquireTokenRedirect, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
    }
    /**
     * Redirects window to given URL.
     * @param urlNavigate
     * @param onRedirectNavigateRequest - onRedirectNavigate callback provided on the request
     */
    async initiateAuthRequest(requestUrl, onRedirectNavigateRequest) {
        this.logger.verbose("RedirectHandler.initiateAuthRequest called");
        // Navigate if valid URL
        if (requestUrl) {
            this.logger.infoPii(`RedirectHandler.initiateAuthRequest: Navigate to: ${requestUrl}`);
            const navigationOptions = {
                apiId: ApiId.acquireTokenRedirect,
                timeout: this.config.system.redirectNavigationTimeout,
                noHistory: false,
            };
            const onRedirectNavigate = onRedirectNavigateRequest ||
                this.config.auth.onRedirectNavigate;
            // If onRedirectNavigate is implemented, invoke it and provide requestUrl
            if (typeof onRedirectNavigate === "function") {
                this.logger.verbose("RedirectHandler.initiateAuthRequest: Invoking onRedirectNavigate callback");
                const navigate = onRedirectNavigate(requestUrl);
                // Returning false from onRedirectNavigate will stop navigation
                if (navigate !== false) {
                    this.logger.verbose("RedirectHandler.initiateAuthRequest: onRedirectNavigate did not return false, navigating");
                    await this.navigationClient.navigateExternal(requestUrl, navigationOptions);
                    return;
                }
                else {
                    this.logger.verbose("RedirectHandler.initiateAuthRequest: onRedirectNavigate returned false, stopping navigation");
                    return;
                }
            }
            else {
                // Navigate window to request URL
                this.logger.verbose("RedirectHandler.initiateAuthRequest: Navigating window to navigate url");
                await this.navigationClient.navigateExternal(requestUrl, navigationOptions);
                return;
            }
        }
        else {
            // Throw error if request URL is empty.
            this.logger.info("RedirectHandler.initiateAuthRequest: Navigate url is empty");
            throw createBrowserAuthError(emptyNavigateUri);
        }
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    async logout(logoutRequest) {
        this.logger.verbose("logoutRedirect called");
        const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.logout);
        try {
            this.eventHandler.emitEvent(EventType.LOGOUT_START, InteractionType.Redirect, logoutRequest);
            // Clear cache on logout
            await this.clearCacheOnLogout(this.correlationId, validLogoutRequest.account);
            const navigationOptions = {
                apiId: ApiId.logout,
                timeout: this.config.system.redirectNavigationTimeout,
                noHistory: false,
            };
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({
                serverTelemetryManager,
                requestAuthority: logoutRequest && logoutRequest.authority,
                requestExtraQueryParameters: logoutRequest?.extraQueryParameters,
                account: (logoutRequest && logoutRequest.account) || undefined,
            });
            if (authClient.authority.protocolMode === ProtocolMode.OIDC) {
                try {
                    authClient.authority.endSessionEndpoint;
                }
                catch {
                    if (validLogoutRequest.account?.homeAccountId) {
                        this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, InteractionType.Redirect, validLogoutRequest);
                        return;
                    }
                }
            }
            // Create logout string and navigate user window to logout.
            const logoutUri = authClient.getLogoutUri(validLogoutRequest);
            this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, InteractionType.Redirect, validLogoutRequest);
            // Check if onRedirectNavigate is implemented, and invoke it if so
            if (logoutRequest &&
                typeof logoutRequest.onRedirectNavigate === "function") {
                const navigate = logoutRequest.onRedirectNavigate(logoutUri);
                if (navigate !== false) {
                    this.logger.verbose("Logout onRedirectNavigate did not return false, navigating");
                    // Ensure interaction is in progress
                    if (!this.browserStorage.getInteractionInProgress()) {
                        this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
                    }
                    await this.navigationClient.navigateExternal(logoutUri, navigationOptions);
                    return;
                }
                else {
                    // Ensure interaction is not in progress
                    this.browserStorage.setInteractionInProgress(false);
                    this.logger.verbose("Logout onRedirectNavigate returned false, stopping navigation");
                }
            }
            else {
                // Ensure interaction is in progress
                if (!this.browserStorage.getInteractionInProgress()) {
                    this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
                }
                await this.navigationClient.navigateExternal(logoutUri, navigationOptions);
                return;
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            this.eventHandler.emitEvent(EventType.LOGOUT_FAILURE, InteractionType.Redirect, null, e);
            this.eventHandler.emitEvent(EventType.LOGOUT_END, InteractionType.Redirect);
            throw e;
        }
        this.eventHandler.emitEvent(EventType.LOGOUT_END, InteractionType.Redirect);
    }
    /**
     * Use to get the redirectStartPage either from request or use current window
     * @param requestStartPage
     */
    getRedirectStartPage(requestStartPage) {
        const redirectStartPage = requestStartPage || window.location.href;
        return UrlString.getAbsoluteUrl(redirectStartPage, getCurrentUri());
    }
}

export { RedirectClient };
//# sourceMappingURL=RedirectClient.mjs.map
