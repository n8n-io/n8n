/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { StandardInteractionClient } from "./StandardInteractionClient.js";
import {
    CommonSilentFlowRequest,
    SilentFlowClient,
    PerformanceEvents,
    invokeAsync,
} from "@azure/msal-common/browser";
import { ApiId } from "../utils/BrowserConstants.js";
import {
    BrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";

export class SilentCacheClient extends StandardInteractionClient {
    /**
     * Returns unexpired tokens from the cache, if available
     * @param silentRequest
     */
    async acquireToken(
        silentRequest: CommonSilentFlowRequest
    ): Promise<AuthenticationResult> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.SilentCacheClientAcquireToken,
            silentRequest.correlationId
        );
        // Telemetry manager only used to increment cacheHits here
        const serverTelemetryManager = this.initializeServerTelemetryManager(
            ApiId.acquireTokenSilent_silentFlow
        );

        const clientConfig = await invokeAsync(
            this.getClientConfiguration.bind(this),
            PerformanceEvents.StandardInteractionClientGetClientConfiguration,
            this.logger,
            this.performanceClient,
            this.correlationId
        )({
            serverTelemetryManager,
            requestAuthority: silentRequest.authority,
            requestAzureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        const silentAuthClient = new SilentFlowClient(
            clientConfig,
            this.performanceClient
        );
        this.logger.verbose("Silent auth client created");

        try {
            const response = await invokeAsync(
                silentAuthClient.acquireCachedToken.bind(silentAuthClient),
                PerformanceEvents.SilentFlowClientAcquireCachedToken,
                this.logger,
                this.performanceClient,
                silentRequest.correlationId
            )(silentRequest);
            const authResponse = response[0] as AuthenticationResult;

            this.performanceClient.addFields(
                {
                    fromCache: true,
                },
                silentRequest.correlationId
            );
            return authResponse;
        } catch (error) {
            if (
                error instanceof BrowserAuthError &&
                error.errorCode === BrowserAuthErrorCodes.cryptoKeyNotFound
            ) {
                this.logger.verbose(
                    "Signing keypair for bound access token not found. Refreshing bound access token and generating a new crypto keypair."
                );
            }
            throw error;
        }
    }

    /**
     * API to silenty clear the browser cache.
     * @param logoutRequest
     */
    logout(logoutRequest?: ClearCacheRequest): Promise<void> {
        this.logger.verbose("logoutRedirect called");
        const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
        return this.clearCacheOnLogout(
            validLogoutRequest.correlationId,
            validLogoutRequest?.account
        );
    }
}
