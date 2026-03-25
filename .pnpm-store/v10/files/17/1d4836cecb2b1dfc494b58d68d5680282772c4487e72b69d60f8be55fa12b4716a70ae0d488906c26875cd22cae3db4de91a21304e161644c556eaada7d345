/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { StandardInteractionClient } from './StandardInteractionClient.mjs';
import { PerformanceEvents, invokeAsync, SilentFlowClient } from '@azure/msal-common/browser';
import { ApiId } from '../utils/BrowserConstants.mjs';
import { BrowserAuthError } from '../error/BrowserAuthError.mjs';
import { cryptoKeyNotFound } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentCacheClient extends StandardInteractionClient {
    /**
     * Returns unexpired tokens from the cache, if available
     * @param silentRequest
     */
    async acquireToken(silentRequest) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentCacheClientAcquireToken, silentRequest.correlationId);
        // Telemetry manager only used to increment cacheHits here
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent_silentFlow);
        const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, this.correlationId)({
            serverTelemetryManager,
            requestAuthority: silentRequest.authority,
            requestAzureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        const silentAuthClient = new SilentFlowClient(clientConfig, this.performanceClient);
        this.logger.verbose("Silent auth client created");
        try {
            const response = await invokeAsync(silentAuthClient.acquireCachedToken.bind(silentAuthClient), PerformanceEvents.SilentFlowClientAcquireCachedToken, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest);
            const authResponse = response[0];
            this.performanceClient.addFields({
                fromCache: true,
            }, silentRequest.correlationId);
            return authResponse;
        }
        catch (error) {
            if (error instanceof BrowserAuthError &&
                error.errorCode === cryptoKeyNotFound) {
                this.logger.verbose("Signing keypair for bound access token not found. Refreshing bound access token and generating a new crypto keypair.");
            }
            throw error;
        }
    }
    /**
     * API to silenty clear the browser cache.
     * @param logoutRequest
     */
    logout(logoutRequest) {
        this.logger.verbose("logoutRedirect called");
        const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
        return this.clearCacheOnLogout(validLogoutRequest.correlationId, validLogoutRequest?.account);
    }
}

export { SilentCacheClient };
//# sourceMappingURL=SilentCacheClient.mjs.map
