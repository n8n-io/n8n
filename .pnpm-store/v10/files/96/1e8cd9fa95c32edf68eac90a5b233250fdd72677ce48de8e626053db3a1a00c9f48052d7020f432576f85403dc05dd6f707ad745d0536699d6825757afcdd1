/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ICrypto,
    Logger,
    PromptValue,
    AuthorizationCodeClient,
    AuthError,
    IPerformanceClient,
    PerformanceEvents,
    invokeAsync,
    invoke,
    ProtocolMode,
    CommonAuthorizationUrlRequest,
    HttpMethod,
    AuthorizeProtocol,
} from "@azure/msal-common/browser";
import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import {
    InteractionType,
    ApiId,
    BrowserConstants,
} from "../utils/BrowserConstants.js";
import {
    initiateCodeRequest,
    initiateCodeFlowWithPost,
    initiateEarRequest,
    monitorIframeForHash,
} from "../interaction_handler/SilentHandler.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import * as BrowserUtils from "../utils/BrowserUtils.js";
import * as ResponseHandler from "../response/ResponseHandler.js";
import * as Authorize from "../protocol/Authorize.js";
import { generatePkceCodes } from "../crypto/PkceGenerator.js";
import { isPlatformAuthAllowed } from "../broker/nativeBroker/PlatformAuthProvider.js";
import { generateEarKey } from "../crypto/BrowserCrypto.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";

export class SilentIframeClient extends StandardInteractionClient {
    protected apiId: ApiId;
    protected nativeStorage: BrowserCacheManager;

    constructor(
        config: BrowserConfiguration,
        storageImpl: BrowserCacheManager,
        browserCrypto: ICrypto,
        logger: Logger,
        eventHandler: EventHandler,
        navigationClient: INavigationClient,
        apiId: ApiId,
        performanceClient: IPerformanceClient,
        nativeStorageImpl: BrowserCacheManager,
        platformAuthProvider?: IPlatformAuthHandler,
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
            platformAuthProvider,
            correlationId
        );
        this.apiId = apiId;
        this.nativeStorage = nativeStorageImpl;
    }

    /**
     * Acquires a token silently by opening a hidden iframe to the /authorize endpoint with prompt=none or prompt=no_session
     * @param request
     */
    async acquireToken(
        request: SsoSilentRequest
    ): Promise<AuthenticationResult> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.SilentIframeClientAcquireToken,
            request.correlationId
        );
        // Check that we have some SSO data
        if (
            !request.loginHint &&
            !request.sid &&
            (!request.account || !request.account.username)
        ) {
            this.logger.warning(
                "No user hint provided. The authorization server may need more information to complete this request."
            );
        }

        // Check the prompt value
        const inputRequest = { ...request };
        if (inputRequest.prompt) {
            if (
                inputRequest.prompt !== PromptValue.NONE &&
                inputRequest.prompt !== PromptValue.NO_SESSION
            ) {
                this.logger.warning(
                    `SilentIframeClient. Replacing invalid prompt ${inputRequest.prompt} with ${PromptValue.NONE}`
                );
                inputRequest.prompt = PromptValue.NONE;
            }
        } else {
            inputRequest.prompt = PromptValue.NONE;
        }

        // Create silent request
        const silentRequest: CommonAuthorizationUrlRequest = await invokeAsync(
            this.initializeAuthorizationRequest.bind(this),
            PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(inputRequest, InteractionType.Silent);
        silentRequest.platformBroker = isPlatformAuthAllowed(
            this.config,
            this.logger,
            this.platformAuthProvider,
            silentRequest.authenticationScheme
        );
        BrowserUtils.preconnect(silentRequest.authority);

        if (this.config.auth.protocolMode === ProtocolMode.EAR) {
            return this.executeEarFlow(silentRequest);
        } else {
            return this.executeCodeFlow(silentRequest);
        }
    }

    /**
     * Executes auth code + PKCE flow
     * @param request
     * @returns
     */
    async executeCodeFlow(
        request: CommonAuthorizationUrlRequest
    ): Promise<AuthenticationResult> {
        let authClient: AuthorizationCodeClient | undefined;
        const serverTelemetryManager = this.initializeServerTelemetryManager(
            this.apiId
        );

        try {
            // Initialize the client
            authClient = await invokeAsync(
                this.createAuthCodeClient.bind(this),
                PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
                this.logger,
                this.performanceClient,
                request.correlationId
            )({
                serverTelemetryManager,
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
            });

            return await invokeAsync(
                this.silentTokenHelper.bind(this),
                PerformanceEvents.SilentIframeClientTokenHelper,
                this.logger,
                this.performanceClient,
                request.correlationId
            )(authClient, request);
        } catch (e) {
            if (e instanceof AuthError) {
                (e as AuthError).setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }

            if (
                !authClient ||
                !(e instanceof AuthError) ||
                e.errorCode !== BrowserConstants.INVALID_GRANT_ERROR
            ) {
                throw e;
            }

            this.performanceClient.addFields(
                {
                    retryError: e.errorCode,
                },
                this.correlationId
            );

            return await invokeAsync(
                this.silentTokenHelper.bind(this),
                PerformanceEvents.SilentIframeClientTokenHelper,
                this.logger,
                this.performanceClient,
                this.correlationId
            )(authClient, request);
        }
    }

    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(
        request: CommonAuthorizationUrlRequest
    ): Promise<AuthenticationResult> {
        const correlationId = request.correlationId;
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
        const pkceCodes = await invokeAsync(
            generatePkceCodes,
            PerformanceEvents.GeneratePkceCodes,
            this.logger,
            this.performanceClient,
            correlationId
        )(this.performanceClient, this.logger, correlationId);
        const silentRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkceCodes.challenge,
        };
        const msalFrame = await invokeAsync(
            initiateEarRequest,
            PerformanceEvents.SilentHandlerInitiateAuthRequest,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            this.config,
            discoveredAuthority,
            silentRequest,
            this.logger,
            this.performanceClient
        );

        const responseType = this.config.auth.OIDCOptions.serverResponseType;
        // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(
            monitorIframeForHash,
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            msalFrame,
            this.config.system.iframeHashTimeout,
            this.config.system.pollIntervalMilliseconds,
            this.performanceClient,
            this.logger,
            correlationId,
            responseType
        );

        const serverParams = invoke(
            ResponseHandler.deserializeResponse,
            PerformanceEvents.DeserializeResponse,
            this.logger,
            this.performanceClient,
            correlationId
        )(responseString, responseType, this.logger);

        if (!serverParams.ear_jwe && serverParams.code) {
            // If server doesn't support EAR, they may fallback to auth code flow instead
            const authClient = await invokeAsync(
                this.createAuthCodeClient.bind(this),
                PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
                this.logger,
                this.performanceClient,
                correlationId
            )({
                serverTelemetryManager: this.initializeServerTelemetryManager(
                    this.apiId
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
                silentRequest,
                serverParams,
                pkceCodes.verifier,
                this.apiId,
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
                silentRequest,
                serverParams,
                this.apiId,
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

    /**
     * Verifies SSO capability by making an iframe request to /authorize without exchanging the code for tokens.
     * This is useful for verifying SSO capability in the background without the overhead of a full token exchange.
     * @param request - The SSO silent request
     * @returns true if SSO verification was successful with a valid authorization code, false otherwise
     */
    async verifySso(request: SsoSilentRequest): Promise<boolean> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.SilentIframeClientAcquireToken,
            request.correlationId
        );

        const inputRequest = { ...request };
        if (!inputRequest.prompt) {
            inputRequest.prompt = PromptValue.NONE;
        }

        // Create silent request
        const silentRequest: CommonAuthorizationUrlRequest = await invokeAsync(
            this.initializeAuthorizationRequest.bind(this),
            PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(inputRequest, InteractionType.Silent);

        const authClient = await invokeAsync(
            this.createAuthCodeClient.bind(this),
            PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
            this.logger,
            this.performanceClient,
            request.correlationId
        )({
            serverTelemetryManager: this.initializeServerTelemetryManager(
                this.apiId
            ),
            requestAuthority: silentRequest.authority,
            requestAzureCloudOptions: silentRequest.azureCloudOptions,
            requestExtraQueryParameters: silentRequest.extraQueryParameters,
            account: silentRequest.account,
        });

        const correlationId = silentRequest.correlationId;
        const pkceCodes = await invokeAsync(
            generatePkceCodes,
            PerformanceEvents.GeneratePkceCodes,
            this.logger,
            this.performanceClient,
            correlationId
        )(this.performanceClient, this.logger, correlationId);

        const requestWithPkce = {
            ...silentRequest,
            codeChallenge: pkceCodes.challenge,
        };

        // Create authorize request url
        const navigateUrl = await invokeAsync(
            Authorize.getAuthCodeRequestUrl,
            PerformanceEvents.GetAuthCodeUrl,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            this.config,
            authClient.authority,
            requestWithPkce,
            this.logger,
            this.performanceClient
        );

        // Get the frame handle for the silent request - this triggers the SSO verification
        const msalFrame = await invokeAsync(
            initiateCodeRequest,
            PerformanceEvents.SilentHandlerInitiateAuthRequest,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            navigateUrl,
            this.performanceClient,
            this.logger,
            correlationId,
            this.config.system.navigateFrameWait
        );

        const responseType = this.config.auth.OIDCOptions.serverResponseType;
        // Monitor the iframe for the response
        const responseString = await invokeAsync(
            monitorIframeForHash,
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            msalFrame,
            this.config.system.iframeHashTimeout,
            this.config.system.pollIntervalMilliseconds,
            this.performanceClient,
            this.logger,
            correlationId,
            responseType
        );

        // Deserialize the response
        const serverParams = invoke(
            ResponseHandler.deserializeResponse,
            PerformanceEvents.DeserializeResponse,
            this.logger,
            this.performanceClient,
            correlationId
        )(responseString, responseType, this.logger);

        // Validate the response - this checks for errors and validates state
        AuthorizeProtocol.validateAuthorizationResponse(
            serverParams,
            silentRequest.state
        );

        // Verify a valid authorization code is present
        if (!serverParams.code) {
            this.logger.warning(
                "SSO verification response did not contain an authorization code",
                correlationId
            );
            return false;
        }

        this.logger.verbose(
            "SSO verification completed successfully with valid authorization code - skipped token exchange",
            correlationId
        );
        return true;
    }

    /**
     * Currently Unsupported
     */
    logout(): Promise<void> {
        // Synchronous so we must reject
        return Promise.reject(
            createBrowserAuthError(
                BrowserAuthErrorCodes.silentLogoutUnsupported
            )
        );
    }

    /**
     * Helper which acquires an authorization code silently using a hidden iframe from given url
     * using the scopes requested as part of the id, and exchanges the code for a set of OAuth tokens.
     * @param navigateUrl
     * @param userRequestScopes
     */
    protected async silentTokenHelper(
        authClient: AuthorizationCodeClient,
        request: CommonAuthorizationUrlRequest
    ): Promise<AuthenticationResult> {
        const correlationId = request.correlationId;
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.SilentIframeClientTokenHelper,
            correlationId
        );
        const pkceCodes = await invokeAsync(
            generatePkceCodes,
            PerformanceEvents.GeneratePkceCodes,
            this.logger,
            this.performanceClient,
            correlationId
        )(this.performanceClient, this.logger, correlationId);

        const silentRequest = {
            ...request,
            codeChallenge: pkceCodes.challenge,
        };

        let msalFrame: HTMLIFrameElement;

        if (request.httpMethod === HttpMethod.POST) {
            msalFrame = await invokeAsync(
                initiateCodeFlowWithPost,
                PerformanceEvents.SilentHandlerInitiateAuthRequest,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                this.config,
                authClient.authority,
                silentRequest,
                this.logger,
                this.performanceClient
            );
        } else {
            // Create authorize request url
            const navigateUrl = await invokeAsync(
                Authorize.getAuthCodeRequestUrl,
                PerformanceEvents.GetAuthCodeUrl,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                this.config,
                authClient.authority,
                silentRequest,
                this.logger,
                this.performanceClient
            );

            // Get the frame handle for the silent request
            msalFrame = await invokeAsync(
                initiateCodeRequest,
                PerformanceEvents.SilentHandlerInitiateAuthRequest,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                navigateUrl,
                this.performanceClient,
                this.logger,
                correlationId,
                this.config.system.navigateFrameWait
            );
        }

        const responseType = this.config.auth.OIDCOptions.serverResponseType;
        // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(
            monitorIframeForHash,
            PerformanceEvents.SilentHandlerMonitorIframeForHash,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            msalFrame,
            this.config.system.iframeHashTimeout,
            this.config.system.pollIntervalMilliseconds,
            this.performanceClient,
            this.logger,
            correlationId,
            responseType
        );
        const serverParams = invoke(
            ResponseHandler.deserializeResponse,
            PerformanceEvents.DeserializeResponse,
            this.logger,
            this.performanceClient,
            correlationId
        )(responseString, responseType, this.logger);

        return invokeAsync(
            Authorize.handleResponseCode,
            PerformanceEvents.HandleResponseCode,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            request,
            serverParams,
            pkceCodes.verifier,
            this.apiId,
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
}
