/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { invokeAsync, PerformanceEvents, AuthError } from '@azure/msal-common/browser';
import { StandardInteractionClient } from './StandardInteractionClient.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { InteractionType } from '../utils/BrowserConstants.mjs';
import { HybridSpaAuthorizationCodeClient } from './HybridSpaAuthorizationCodeClient.mjs';
import { InteractionHandler } from '../interaction_handler/InteractionHandler.mjs';
import { authCodeRequired, silentLogoutUnsupported } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentAuthCodeClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, apiId, performanceClient, platformAuthProvider, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthProvider, correlationId);
        this.apiId = apiId;
    }
    /**
     * Acquires a token silently by redeeming an authorization code against the /token endpoint
     * @param request
     */
    async acquireToken(request) {
        // Auth code payload is required
        if (!request.code) {
            throw createBrowserAuthError(authCodeRequired);
        }
        // Create silent request
        const silentRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, request.correlationId)(request, InteractionType.Silent);
        const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
        try {
            // Create auth code request (PKCE not needed)
            const authCodeRequest = {
                ...silentRequest,
                code: request.code,
            };
            // Initialize the client
            const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, request.correlationId)({
                serverTelemetryManager,
                requestAuthority: silentRequest.authority,
                requestAzureCloudOptions: silentRequest.azureCloudOptions,
                requestExtraQueryParameters: silentRequest.extraQueryParameters,
                account: silentRequest.account,
            });
            const authClient = new HybridSpaAuthorizationCodeClient(clientConfig);
            this.logger.verbose("Auth code client created");
            // Create silent handler
            const interactionHandler = new InteractionHandler(authClient, this.browserStorage, authCodeRequest, this.logger, this.performanceClient);
            // Handle auth code parameters from request
            return await invokeAsync(interactionHandler.handleCodeResponseFromServer.bind(interactionHandler), PerformanceEvents.HandleCodeResponseFromServer, this.logger, this.performanceClient, request.correlationId)({
                code: request.code,
                msgraph_host: request.msGraphHost,
                cloud_graph_host_name: request.cloudGraphHostName,
                cloud_instance_host_name: request.cloudInstanceHostName,
            }, silentRequest, false);
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
     * Currently Unsupported
     */
    logout() {
        // Synchronous so we must reject
        return Promise.reject(createBrowserAuthError(silentLogoutUnsupported));
    }
}

export { SilentAuthCodeClient };
//# sourceMappingURL=SilentAuthCodeClient.mjs.map
