/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { StandardInteractionClient } from './StandardInteractionClient.mjs';
import { PerformanceEvents, invokeAsync, RefreshTokenClient } from '@azure/msal-common/browser';
import { ApiId } from '../utils/BrowserConstants.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { initializeBaseRequest } from '../request/RequestHelpers.mjs';
import { silentLogoutUnsupported } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentRefreshClient extends StandardInteractionClient {
    /**
     * Exchanges the refresh token for new tokens
     * @param request
     */
    async acquireToken(request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentRefreshClientAcquireToken, request.correlationId);
        const baseRequest = await invokeAsync(initializeBaseRequest, PerformanceEvents.InitializeBaseRequest, this.logger, this.performanceClient, request.correlationId)(request, this.config, this.performanceClient, this.logger);
        const silentRequest = {
            ...request,
            ...baseRequest,
        };
        if (request.redirectUri) {
            // Make sure any passed redirectUri is converted to an absolute URL - redirectUri is not a required parameter for refresh token redemption so only include if explicitly provided
            silentRequest.redirectUri = this.getRedirectUri(request.redirectUri);
        }
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent_silentFlow);
        const refreshTokenClient = await this.createRefreshTokenClient({
            serverTelemetryManager,
            authorityUrl: silentRequest.authority,
            azureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        // Send request to renew token. Auth module will throw errors if token cannot be renewed.
        return invokeAsync(refreshTokenClient.acquireTokenByRefreshToken.bind(refreshTokenClient), PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken, this.logger, this.performanceClient, request.correlationId)(silentRequest).catch((e) => {
            e.setCorrelationId(this.correlationId);
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        });
    }
    /**
     * Currently Unsupported
     */
    logout() {
        // Synchronous so we must reject
        return Promise.reject(createBrowserAuthError(silentLogoutUnsupported));
    }
    /**
     * Creates a Refresh Client with the given authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         authorityUrl?: string;
     *         azureCloudOptions?: AzureCloudOptions;
     *         extraQueryParams?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    async createRefreshTokenClient(params) {
        // Create auth module.
        const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, this.correlationId)({
            serverTelemetryManager: params.serverTelemetryManager,
            requestAuthority: params.authorityUrl,
            requestAzureCloudOptions: params.azureCloudOptions,
            requestExtraQueryParameters: params.extraQueryParameters,
            account: params.account,
        });
        return new RefreshTokenClient(clientConfig, this.performanceClient);
    }
}

export { SilentRefreshClient };
//# sourceMappingURL=SilentRefreshClient.mjs.map
