/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ICrypto,
    Logger,
    CommonAuthorizationCodeRequest,
    AuthError,
    IPerformanceClient,
    PerformanceEvents,
    invokeAsync,
    CommonAuthorizationUrlRequest,
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
import { InteractionType, ApiId } from "../utils/BrowserConstants.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { HybridSpaAuthorizationCodeClient } from "./HybridSpaAuthorizationCodeClient.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { InteractionHandler } from "../interaction_handler/InteractionHandler.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";

export class SilentAuthCodeClient extends StandardInteractionClient {
    private apiId: ApiId;

    constructor(
        config: BrowserConfiguration,
        storageImpl: BrowserCacheManager,
        browserCrypto: ICrypto,
        logger: Logger,
        eventHandler: EventHandler,
        navigationClient: INavigationClient,
        apiId: ApiId,
        performanceClient: IPerformanceClient,
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
    }

    /**
     * Acquires a token silently by redeeming an authorization code against the /token endpoint
     * @param request
     */
    async acquireToken(
        request: AuthorizationCodeRequest
    ): Promise<AuthenticationResult> {
        // Auth code payload is required
        if (!request.code) {
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.authCodeRequired
            );
        }

        // Create silent request
        const silentRequest: CommonAuthorizationUrlRequest = await invokeAsync(
            this.initializeAuthorizationRequest.bind(this),
            PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(request, InteractionType.Silent);

        const serverTelemetryManager = this.initializeServerTelemetryManager(
            this.apiId
        );

        try {
            // Create auth code request (PKCE not needed)
            const authCodeRequest: CommonAuthorizationCodeRequest = {
                ...silentRequest,
                code: request.code,
            };

            // Initialize the client
            const clientConfig = await invokeAsync(
                this.getClientConfiguration.bind(this),
                PerformanceEvents.StandardInteractionClientGetClientConfiguration,
                this.logger,
                this.performanceClient,
                request.correlationId
            )({
                serverTelemetryManager,
                requestAuthority: silentRequest.authority,
                requestAzureCloudOptions: silentRequest.azureCloudOptions,
                requestExtraQueryParameters: silentRequest.extraQueryParameters,
                account: silentRequest.account,
            });
            const authClient: HybridSpaAuthorizationCodeClient =
                new HybridSpaAuthorizationCodeClient(clientConfig);
            this.logger.verbose("Auth code client created");

            // Create silent handler
            const interactionHandler = new InteractionHandler(
                authClient,
                this.browserStorage,
                authCodeRequest,
                this.logger,
                this.performanceClient
            );

            // Handle auth code parameters from request
            return await invokeAsync(
                interactionHandler.handleCodeResponseFromServer.bind(
                    interactionHandler
                ),
                PerformanceEvents.HandleCodeResponseFromServer,
                this.logger,
                this.performanceClient,
                request.correlationId
            )(
                {
                    code: request.code,
                    msgraph_host: request.msGraphHost,
                    cloud_graph_host_name: request.cloudGraphHostName,
                    cloud_instance_host_name: request.cloudInstanceHostName,
                },
                silentRequest,
                false
            );
        } catch (e) {
            if (e instanceof AuthError) {
                (e as AuthError).setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
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
}
