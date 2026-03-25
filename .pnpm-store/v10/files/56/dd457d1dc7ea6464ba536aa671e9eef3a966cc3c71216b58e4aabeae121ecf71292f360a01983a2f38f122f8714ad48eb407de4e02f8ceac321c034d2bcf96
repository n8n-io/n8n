/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthorizationCodeClient,
    CommonEndSessionRequest,
    UrlString,
    AuthError,
    OIDC_DEFAULT_SCOPES,
    PerformanceEvents,
    IPerformanceClient,
    Logger,
    ICrypto,
    ProtocolMode,
    ServerResponseType,
    invokeAsync,
    invoke,
    PkceCodes,
    CommonAuthorizationUrlRequest,
    HttpMethod,
} from "@azure/msal-common/browser";
import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { EventType } from "../event/EventType.js";
import {
    InteractionType,
    ApiId,
    BrowserConstants,
} from "../utils/BrowserConstants.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { NavigationOptions } from "../navigation/NavigationOptions.js";
import * as BrowserUtils from "../utils/BrowserUtils.js";
import { PopupRequest } from "../request/PopupRequest.js";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { EventHandler } from "../event/EventHandler.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { PopupWindowAttributes } from "../request/PopupWindowAttributes.js";
import { EventError } from "../event/EventMessage.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import * as ResponseHandler from "../response/ResponseHandler.js";
import * as Authorize from "../protocol/Authorize.js";
import { generatePkceCodes } from "../crypto/PkceGenerator.js";
import { isPlatformAuthAllowed } from "../broker/nativeBroker/PlatformAuthProvider.js";
import { generateEarKey } from "../crypto/BrowserCrypto.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
import { validateRequestMethod } from "../request/RequestHelpers.js";

export type PopupParams = {
    popup?: Window | null;
    popupName: string;
    popupWindowAttributes: PopupWindowAttributes;
    popupWindowParent: Window;
};

export class PopupClient extends StandardInteractionClient {
    private currentWindow: Window | undefined;
    protected nativeStorage: BrowserCacheManager;

    constructor(
        config: BrowserConfiguration,
        storageImpl: BrowserCacheManager,
        browserCrypto: ICrypto,
        logger: Logger,
        eventHandler: EventHandler,
        navigationClient: INavigationClient,
        performanceClient: IPerformanceClient,
        nativeStorageImpl: BrowserCacheManager,
        platformAuthHandler?: IPlatformAuthHandler,
        correlationId?: string
    ) {
        super(
            config,
            storageImpl,
            browserCrypto,
            logger,
            eventHandler,
            navigationClient,
            performanceClient,
            platformAuthHandler,
            correlationId
        );
        // Properly sets this reference for the unload event.
        this.unloadWindow = this.unloadWindow.bind(this);
        this.nativeStorage = nativeStorageImpl;
        this.eventHandler = eventHandler;
    }

    /**
     * Acquires tokens by opening a popup window to the /authorize endpoint of the authority
     * @param request
     * @param pkceCodes
     */
    acquireToken(
        request: PopupRequest,
        pkceCodes?: PkceCodes
    ): Promise<AuthenticationResult> {
        let popupParams: PopupParams | undefined = undefined;
        try {
            const popupName = this.generatePopupName(
                request.scopes || OIDC_DEFAULT_SCOPES,
                request.authority || this.config.auth.authority
            );
            popupParams = {
                popupName,
                popupWindowAttributes: request.popupWindowAttributes || {},
                popupWindowParent: request.popupWindowParent ?? window,
            };

            this.performanceClient.addFields(
                { isAsyncPopup: this.config.system.asyncPopups },
                this.correlationId
            );

            // asyncPopups flag is true. Acquires token without first opening popup. Popup will be opened later asynchronously.
            if (this.config.system.asyncPopups) {
                this.logger.verbose("asyncPopups set to true, acquiring token");
                // Passes on popup position and dimensions if in request
                return this.acquireTokenPopupAsync(
                    request,
                    popupParams,
                    pkceCodes
                );
            } else {
                // Pre-validate request method to avoid opening popup if the request is invalid
                const validatedRequest: PopupRequest = {
                    ...request,
                    httpMethod: validateRequestMethod(
                        request,
                        this.config.auth.protocolMode
                    ),
                };
                // asyncPopups flag is set to false. Opens popup before acquiring token.
                this.logger.verbose(
                    "asyncPopup set to false, opening popup before acquiring token"
                );
                popupParams.popup = this.openSizedPopup(
                    "about:blank",
                    popupParams
                );
                return this.acquireTokenPopupAsync(
                    validatedRequest,
                    popupParams,
                    pkceCodes
                );
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logout(logoutRequest?: EndSessionPopupRequest): Promise<void> {
        try {
            this.logger.verbose("logoutPopup called");
            const validLogoutRequest =
                this.initializeLogoutRequest(logoutRequest);
            const popupParams: PopupParams = {
                popupName: this.generateLogoutPopupName(validLogoutRequest),
                popupWindowAttributes:
                    logoutRequest?.popupWindowAttributes || {},
                popupWindowParent: logoutRequest?.popupWindowParent ?? window,
            };
            const authority = logoutRequest && logoutRequest.authority;
            const mainWindowRedirectUri =
                logoutRequest && logoutRequest.mainWindowRedirectUri;

            // asyncPopups flag is true. Acquires token without first opening popup. Popup will be opened later asynchronously.
            if (this.config.system.asyncPopups) {
                this.logger.verbose("asyncPopups set to true");
                // Passes on popup position and dimensions if in request
                return this.logoutPopupAsync(
                    validLogoutRequest,
                    popupParams,
                    authority,
                    mainWindowRedirectUri
                );
            } else {
                // asyncPopups flag is set to false. Opens popup before logging out.
                this.logger.verbose("asyncPopup set to false, opening popup");
                popupParams.popup = this.openSizedPopup(
                    "about:blank",
                    popupParams
                );
                return this.logoutPopupAsync(
                    validLogoutRequest,
                    popupParams,
                    authority,
                    mainWindowRedirectUri
                );
            }
        } catch (e) {
            // Since this function is synchronous we need to reject
            return Promise.reject(e);
        }
    }

    /**
     * Helper which obtains an access_token for your API via opening a popup window in the user's browser
     * @param request
     * @param popupParams
     * @param pkceCodes
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    protected async acquireTokenPopupAsync(
        request: PopupRequest,
        popupParams: PopupParams,
        pkceCodes?: PkceCodes
    ): Promise<AuthenticationResult> {
        this.logger.verbose("acquireTokenPopupAsync called");

        const validRequest = await invokeAsync(
            this.initializeAuthorizationRequest.bind(this),
            PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(request, InteractionType.Popup);

        /*
         * Skip pre-connect for async popups to reduce time between user interaction and popup window creation to avoid
         * popup from being blocked by browsers with shorter popup timers
         */
        if (popupParams.popup) {
            BrowserUtils.preconnect(validRequest.authority);
        }

        const isPlatformBroker = isPlatformAuthAllowed(
            this.config,
            this.logger,
            this.platformAuthProvider,
            request.authenticationScheme
        );
        validRequest.platformBroker = isPlatformBroker;

        if (this.config.auth.protocolMode === ProtocolMode.EAR) {
            return this.executeEarFlow(validRequest, popupParams, pkceCodes);
        } else {
            return this.executeCodeFlow(validRequest, popupParams, pkceCodes);
        }
    }

    /**
     * Executes auth code + PKCE flow
     * @param request
     * @param popupParams
     * @param pkceCodes
     * @returns
     */
    async executeCodeFlow(
        request: CommonAuthorizationUrlRequest,
        popupParams: PopupParams,
        pkceCodes?: PkceCodes
    ): Promise<AuthenticationResult> {
        const correlationId = request.correlationId;
        const serverTelemetryManager = this.initializeServerTelemetryManager(
            ApiId.acquireTokenPopup
        );

        const pkce =
            pkceCodes ||
            (await invokeAsync(
                generatePkceCodes,
                PerformanceEvents.GeneratePkceCodes,
                this.logger,
                this.performanceClient,
                correlationId
            )(this.performanceClient, this.logger, correlationId));

        const popupRequest = {
            ...request,
            codeChallenge: pkce.challenge,
        };

        try {
            // Initialize the client
            const authClient: AuthorizationCodeClient = await invokeAsync(
                this.createAuthCodeClient.bind(this),
                PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
                this.logger,
                this.performanceClient,
                correlationId
            )({
                serverTelemetryManager,
                requestAuthority: popupRequest.authority,
                requestAzureCloudOptions: popupRequest.azureCloudOptions,
                requestExtraQueryParameters: popupRequest.extraQueryParameters,
                account: popupRequest.account,
            });

            if (popupRequest.httpMethod === HttpMethod.POST) {
                return await this.executeCodeFlowWithPost(
                    popupRequest,
                    popupParams,
                    authClient,
                    pkce.verifier
                );
            } else {
                // Create acquire token url.
                const navigateUrl = await invokeAsync(
                    Authorize.getAuthCodeRequestUrl,
                    PerformanceEvents.GetAuthCodeUrl,
                    this.logger,
                    this.performanceClient,
                    correlationId
                )(
                    this.config,
                    authClient.authority,
                    popupRequest,
                    this.logger,
                    this.performanceClient
                );

                // Show the UI once the url has been created. Get the window handle for the popup.
                const popupWindow: Window = this.initiateAuthRequest(
                    navigateUrl,
                    popupParams
                );
                this.eventHandler.emitEvent(
                    EventType.POPUP_OPENED,
                    InteractionType.Popup,
                    { popupWindow },
                    null
                );

                // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
                const responseString = await this.monitorPopupForHash(
                    popupWindow,
                    popupParams.popupWindowParent
                );

                const serverParams = invoke(
                    ResponseHandler.deserializeResponse,
                    PerformanceEvents.DeserializeResponse,
                    this.logger,
                    this.performanceClient,
                    this.correlationId
                )(
                    responseString,
                    this.config.auth.OIDCOptions.serverResponseType,
                    this.logger
                );

                return await invokeAsync(
                    Authorize.handleResponseCode,
                    PerformanceEvents.HandleResponseCode,
                    this.logger,
                    this.performanceClient,
                    correlationId
                )(
                    request,
                    serverParams,
                    pkce.verifier,
                    ApiId.acquireTokenPopup,
                    this.config,
                    authClient,
                    this.browserStorage,
                    this.nativeStorage,
                    this.eventHandler,
                    this.logger,
                    this.performanceClient,
                    this.platformAuthProvider
                );
            }
        } catch (e) {
            // Close the synchronous popup if an error is thrown before the window unload event is registered
            popupParams.popup?.close();

            if (e instanceof AuthError) {
                (e as AuthError).setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }

    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(
        request: CommonAuthorizationUrlRequest,
        popupParams: PopupParams,
        pkceCodes?: PkceCodes
    ): Promise<AuthenticationResult> {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(
            this.getDiscoveredAuthority.bind(this),
            PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority,
            this.logger,
            this.performanceClient,
            correlationId
        )({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });

        const earJwk = await invokeAsync(
            generateEarKey,
            PerformanceEvents.GenerateEarKey,
            this.logger,
            this.performanceClient,
            correlationId
        )();
        const pkce =
            pkceCodes ||
            (await invokeAsync(
                generatePkceCodes,
                PerformanceEvents.GeneratePkceCodes,
                this.logger,
                this.performanceClient,
                correlationId
            )(this.performanceClient, this.logger, correlationId));

        const popupRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkce.challenge,
        };
        const popupWindow =
            popupParams.popup || this.openPopup("about:blank", popupParams);

        const form = await Authorize.getEARForm(
            popupWindow.document,
            this.config,
            discoveredAuthority,
            popupRequest,
            this.logger,
            this.performanceClient
        );
        form.submit();

        // Monitor the popup for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(
            this.monitorPopupForHash.bind(this),
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            this.logger,
            this.performanceClient,
            correlationId
        )(popupWindow, popupParams.popupWindowParent);

        const serverParams = invoke(
            ResponseHandler.deserializeResponse,
            PerformanceEvents.DeserializeResponse,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(
            responseString,
            this.config.auth.OIDCOptions.serverResponseType,
            this.logger
        );

        if (!serverParams.ear_jwe && serverParams.code) {
            const authClient = await invokeAsync(
                this.createAuthCodeClient.bind(this),
                PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
                this.logger,
                this.performanceClient,
                correlationId
            )({
                serverTelemetryManager: this.initializeServerTelemetryManager(
                    ApiId.acquireTokenPopup
                ),
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
                authority: discoveredAuthority,
            });

            return invokeAsync(
                Authorize.handleResponseCode,
                PerformanceEvents.HandleResponseCode,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                popupRequest,
                serverParams,
                pkce.verifier,
                ApiId.acquireTokenPopup,
                this.config,
                authClient,
                this.browserStorage,
                this.nativeStorage,
                this.eventHandler,
                this.logger,
                this.performanceClient,
                this.platformAuthProvider
            );
        } else {
            return invokeAsync(
                Authorize.handleResponseEAR,
                PerformanceEvents.HandleResponseEar,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                popupRequest,
                serverParams,
                ApiId.acquireTokenPopup,
                this.config,
                discoveredAuthority,
                this.browserStorage,
                this.nativeStorage,
                this.eventHandler,
                this.logger,
                this.performanceClient,
                this.platformAuthProvider
            );
        }
    }

    async executeCodeFlowWithPost(
        request: CommonAuthorizationUrlRequest,
        popupParams: PopupParams,
        authClient: AuthorizationCodeClient,
        pkceVerifier: string
    ): Promise<AuthenticationResult> {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(
            this.getDiscoveredAuthority.bind(this),
            PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority,
            this.logger,
            this.performanceClient,
            correlationId
        )({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });

        const popupWindow =
            popupParams.popup || this.openPopup("about:blank", popupParams);

        const form = await Authorize.getCodeForm(
            popupWindow.document,
            this.config,
            discoveredAuthority,
            request,
            this.logger,
            this.performanceClient
        );

        form.submit();

        // Monitor the popup for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(
            this.monitorPopupForHash.bind(this),
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            this.logger,
            this.performanceClient,
            correlationId
        )(popupWindow, popupParams.popupWindowParent);

        const serverParams = invoke(
            ResponseHandler.deserializeResponse,
            PerformanceEvents.DeserializeResponse,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(
            responseString,
            this.config.auth.OIDCOptions.serverResponseType,
            this.logger
        );

        return invokeAsync(
            Authorize.handleResponseCode,
            PerformanceEvents.HandleResponseCode,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            request,
            serverParams,
            pkceVerifier,
            ApiId.acquireTokenPopup,
            this.config,
            authClient,
            this.browserStorage,
            this.nativeStorage,
            this.eventHandler,
            this.logger,
            this.performanceClient,
            this.platformAuthProvider
        );
    }

    /**
     *
     * @param validRequest
     * @param popupName
     * @param requestAuthority
     * @param popup
     * @param mainWindowRedirectUri
     * @param popupWindowAttributes
     */
    protected async logoutPopupAsync(
        validRequest: CommonEndSessionRequest,
        popupParams: PopupParams,
        requestAuthority?: string,
        mainWindowRedirectUri?: string
    ): Promise<void> {
        this.logger.verbose("logoutPopupAsync called");
        this.eventHandler.emitEvent(
            EventType.LOGOUT_START,
            InteractionType.Popup,
            validRequest
        );

        const serverTelemetryManager = this.initializeServerTelemetryManager(
            ApiId.logoutPopup
        );

        try {
            // Clear cache on logout
            await this.clearCacheOnLogout(
                this.correlationId,
                validRequest.account
            );

            // Initialize the client
            const authClient = await invokeAsync(
                this.createAuthCodeClient.bind(this),
                PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
                this.logger,
                this.performanceClient,
                this.correlationId
            )({
                serverTelemetryManager,
                requestAuthority: requestAuthority,
                account: validRequest.account || undefined,
            });

            try {
                authClient.authority.endSessionEndpoint;
            } catch {
                if (
                    validRequest.account?.homeAccountId &&
                    validRequest.postLogoutRedirectUri &&
                    authClient.authority.protocolMode === ProtocolMode.OIDC
                ) {
                    this.eventHandler.emitEvent(
                        EventType.LOGOUT_SUCCESS,
                        InteractionType.Popup,
                        validRequest
                    );

                    if (mainWindowRedirectUri) {
                        const navigationOptions: NavigationOptions = {
                            apiId: ApiId.logoutPopup,
                            timeout:
                                this.config.system.redirectNavigationTimeout,
                            noHistory: false,
                        };
                        const absoluteUrl = UrlString.getAbsoluteUrl(
                            mainWindowRedirectUri,
                            BrowserUtils.getCurrentUri()
                        );
                        await this.navigationClient.navigateInternal(
                            absoluteUrl,
                            navigationOptions
                        );
                    }

                    popupParams.popup?.close();

                    return;
                }
            }

            // Create logout string and navigate user window to logout.
            const logoutUri: string = authClient.getLogoutUri(validRequest);

            this.eventHandler.emitEvent(
                EventType.LOGOUT_SUCCESS,
                InteractionType.Popup,
                validRequest
            );

            // Open the popup window to requestUrl.
            const popupWindow = this.openPopup(logoutUri, popupParams);
            this.eventHandler.emitEvent(
                EventType.POPUP_OPENED,
                InteractionType.Popup,
                { popupWindow },
                null
            );

            await this.monitorPopupForHash(
                popupWindow,
                popupParams.popupWindowParent
            ).catch(() => {
                // Swallow any errors related to monitoring the window. Server logout is best effort
            });

            if (mainWindowRedirectUri) {
                const navigationOptions: NavigationOptions = {
                    apiId: ApiId.logoutPopup,
                    timeout: this.config.system.redirectNavigationTimeout,
                    noHistory: false,
                };
                const absoluteUrl = UrlString.getAbsoluteUrl(
                    mainWindowRedirectUri,
                    BrowserUtils.getCurrentUri()
                );

                this.logger.verbose(
                    "Redirecting main window to url specified in the request"
                );
                this.logger.verbosePii(
                    `Redirecting main window to: ${absoluteUrl}`
                );
                await this.navigationClient.navigateInternal(
                    absoluteUrl,
                    navigationOptions
                );
            } else {
                this.logger.verbose("No main window navigation requested");
            }
        } catch (e) {
            // Close the synchronous popup if an error is thrown before the window unload event is registered
            popupParams.popup?.close();

            if (e instanceof AuthError) {
                (e as AuthError).setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            this.eventHandler.emitEvent(
                EventType.LOGOUT_FAILURE,
                InteractionType.Popup,
                null,
                e as EventError
            );
            this.eventHandler.emitEvent(
                EventType.LOGOUT_END,
                InteractionType.Popup
            );
            throw e;
        }

        this.eventHandler.emitEvent(
            EventType.LOGOUT_END,
            InteractionType.Popup
        );
    }

    /**
     * Opens a popup window with given request Url.
     * @param requestUrl
     */
    initiateAuthRequest(requestUrl: string, params: PopupParams): Window {
        // Check that request url is not empty.
        if (requestUrl) {
            this.logger.infoPii(`Navigate to: ${requestUrl}`);
            // Open the popup window to requestUrl.
            return this.openPopup(requestUrl, params);
        } else {
            // Throw error if request URL is empty.
            this.logger.error("Navigate url is empty");
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.emptyNavigateUri
            );
        }
    }

    /**
     * Monitors a window until it loads a url with the same origin.
     * @param popupWindow - window that is being monitored
     * @param timeout - timeout for processing hash once popup is redirected back to application
     */
    monitorPopupForHash(
        popupWindow: Window,
        popupWindowParent: Window
    ): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.logger.verbose(
                "PopupHandler.monitorPopupForHash - polling started"
            );

            const intervalId = setInterval(() => {
                // Window is closed
                if (popupWindow.closed) {
                    this.logger.error(
                        "PopupHandler.monitorPopupForHash - window closed"
                    );
                    clearInterval(intervalId);
                    reject(
                        createBrowserAuthError(
                            BrowserAuthErrorCodes.userCancelled
                        )
                    );
                    return;
                }

                let href = "";
                try {
                    /*
                     * Will throw if cross origin,
                     * which should be caught and ignored
                     * since we need the interval to keep running while on STS UI.
                     */
                    href = popupWindow.location.href;
                } catch (e) {}

                // Don't process blank pages or cross domain
                if (!href || href === "about:blank") {
                    return;
                }
                clearInterval(intervalId);

                let responseString = "";
                const responseType =
                    this.config.auth.OIDCOptions.serverResponseType;
                if (popupWindow) {
                    if (responseType === ServerResponseType.QUERY) {
                        responseString = popupWindow.location.search;
                    } else {
                        responseString = popupWindow.location.hash;
                    }
                }

                this.logger.verbose(
                    "PopupHandler.monitorPopupForHash - popup window is on same origin as caller"
                );

                resolve(responseString);
            }, this.config.system.pollIntervalMilliseconds);
        }).finally(() => {
            this.cleanPopup(popupWindow, popupWindowParent);
        });
    }

    /**
     * @hidden
     *
     * Configures popup window for login.
     *
     * @param urlNavigate
     * @param title
     * @param popUpWidth
     * @param popUpHeight
     * @param popupWindowAttributes
     * @ignore
     * @hidden
     */
    openPopup(urlNavigate: string, popupParams: PopupParams): Window {
        try {
            let popupWindow;
            // Popup window passed in, setting url to navigate to
            if (popupParams.popup) {
                popupWindow = popupParams.popup;
                this.logger.verbosePii(
                    `Navigating popup window to: ${urlNavigate}`
                );
                popupWindow.location.assign(urlNavigate);
            } else if (typeof popupParams.popup === "undefined") {
                // Popup will be undefined if it was not passed in
                this.logger.verbosePii(
                    `Opening popup window to: ${urlNavigate}`
                );
                popupWindow = this.openSizedPopup(urlNavigate, popupParams);
            }

            // Popup will be null if popups are blocked
            if (!popupWindow) {
                throw createBrowserAuthError(
                    BrowserAuthErrorCodes.emptyWindowError
                );
            }
            if (popupWindow.focus) {
                popupWindow.focus();
            }
            this.currentWindow = popupWindow;
            popupParams.popupWindowParent.addEventListener(
                "beforeunload",
                this.unloadWindow
            );

            return popupWindow;
        } catch (e) {
            this.logger.error(
                "error opening popup " + (e as AuthError).message
            );
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.popupWindowError
            );
        }
    }

    /**
     * Helper function to set popup window dimensions and position
     * @param urlNavigate
     * @param popupName
     * @param popupWindowAttributes
     * @returns
     */
    openSizedPopup(
        urlNavigate: string,
        { popupName, popupWindowAttributes, popupWindowParent }: PopupParams
    ): Window | null {
        /**
         * adding winLeft and winTop to account for dual monitor
         * using screenLeft and screenTop for IE8 and earlier
         */
        const winLeft = popupWindowParent.screenLeft
            ? popupWindowParent.screenLeft
            : popupWindowParent.screenX;
        const winTop = popupWindowParent.screenTop
            ? popupWindowParent.screenTop
            : popupWindowParent.screenY;
        /**
         * window.innerWidth displays browser window"s height and width excluding toolbars
         * using document.documentElement.clientWidth for IE8 and earlier
         */
        const winWidth =
            popupWindowParent.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;
        const winHeight =
            popupWindowParent.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight;

        let width = popupWindowAttributes.popupSize?.width;
        let height = popupWindowAttributes.popupSize?.height;
        let top = popupWindowAttributes.popupPosition?.top;
        let left = popupWindowAttributes.popupPosition?.left;

        if (!width || width < 0 || width > winWidth) {
            this.logger.verbose(
                "Default popup window width used. Window width not configured or invalid."
            );
            width = BrowserConstants.POPUP_WIDTH;
        }

        if (!height || height < 0 || height > winHeight) {
            this.logger.verbose(
                "Default popup window height used. Window height not configured or invalid."
            );
            height = BrowserConstants.POPUP_HEIGHT;
        }

        if (!top || top < 0 || top > winHeight) {
            this.logger.verbose(
                "Default popup window top position used. Window top not configured or invalid."
            );
            top = Math.max(
                0,
                winHeight / 2 - BrowserConstants.POPUP_HEIGHT / 2 + winTop
            );
        }

        if (!left || left < 0 || left > winWidth) {
            this.logger.verbose(
                "Default popup window left position used. Window left not configured or invalid."
            );
            left = Math.max(
                0,
                winWidth / 2 - BrowserConstants.POPUP_WIDTH / 2 + winLeft
            );
        }

        return popupWindowParent.open(
            urlNavigate,
            popupName,
            `width=${width}, height=${height}, top=${top}, left=${left}, scrollbars=yes`
        );
    }

    /**
     * Event callback to unload main window.
     */
    unloadWindow(e: Event): void {
        if (this.currentWindow) {
            this.currentWindow.close();
        }
        // Guarantees browser unload will happen, so no other errors will be thrown.
        e.preventDefault();
    }

    /**
     * Closes popup, removes any state vars created during popup calls.
     * @param popupWindow
     */
    cleanPopup(popupWindow: Window, popupWindowParent: Window): void {
        // Close window.
        popupWindow.close();

        // Remove window unload function
        popupWindowParent.removeEventListener(
            "beforeunload",
            this.unloadWindow
        );
    }

    /**
     * Generates the name for the popup based on the client id and request
     * @param clientId
     * @param request
     */
    generatePopupName(scopes: Array<string>, authority: string): string {
        return `${BrowserConstants.POPUP_NAME_PREFIX}.${
            this.config.auth.clientId
        }.${scopes.join("-")}.${authority}.${this.correlationId}`;
    }

    /**
     * Generates the name for the popup based on the client id and request for logouts
     * @param clientId
     * @param request
     */
    generateLogoutPopupName(request: CommonEndSessionRequest): string {
        const homeAccountId = request.account && request.account.homeAccountId;
        return `${BrowserConstants.POPUP_NAME_PREFIX}.${this.config.auth.clientId}.${homeAccountId}.${this.correlationId}`;
    }
}
