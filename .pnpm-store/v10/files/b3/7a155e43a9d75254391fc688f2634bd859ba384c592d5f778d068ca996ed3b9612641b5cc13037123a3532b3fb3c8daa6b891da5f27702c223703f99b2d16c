/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { StandardInteractionClient } from "./StandardInteractionClient.js";
import {
    CommonSilentFlowRequest,
    ServerTelemetryManager,
    RefreshTokenClient,
    AuthError,
    AzureCloudOptions,
    PerformanceEvents,
    invokeAsync,
    AccountInfo,
    StringDict,
} from "@azure/msal-common/browser";
import { ApiId } from "../utils/BrowserConstants.js";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { initializeBaseRequest } from "../request/RequestHelpers.js";

export class SilentRefreshClient extends StandardInteractionClient {
    /**
     * Exchanges the refresh token for new tokens
     * @param request
     */
    async acquireToken(
        request: CommonSilentFlowRequest
    ): Promise<AuthenticationResult> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.SilentRefreshClientAcquireToken,
            request.correlationId
        );

        const baseRequest = await invokeAsync(
            initializeBaseRequest,
            PerformanceEvents.InitializeBaseRequest,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(request, this.config, this.performanceClient, this.logger);
        const silentRequest: CommonSilentFlowRequest = {
            ...request,
            ...baseRequest,
        };

        if (request.redirectUri) {
            // Make sure any passed redirectUri is converted to an absolute URL - redirectUri is not a required parameter for refresh token redemption so only include if explicitly provided
            silentRequest.redirectUri = this.getRedirectUri(
                request.redirectUri
            );
        }

        const serverTelemetryManager = this.initializeServerTelemetryManager(
            ApiId.acquireTokenSilent_silentFlow
        );

        const refreshTokenClient = await this.createRefreshTokenClient({
            serverTelemetryManager,
            authorityUrl: silentRequest.authority,
            azureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        // Send request to renew token. Auth module will throw errors if token cannot be renewed.
        return invokeAsync(
            refreshTokenClient.acquireTokenByRefreshToken.bind(
                refreshTokenClient
            ),
            PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(silentRequest).catch((e: AuthError) => {
            (e as AuthError).setCorrelationId(this.correlationId);
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }) as Promise<AuthenticationResult>;
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
     * Creates a Refresh Client with the given authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         authorityUrl?: string;
     *         azureCloudOptions?: AzureCloudOptions;
     *         extraQueryParams?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    protected async createRefreshTokenClient(params: {
        serverTelemetryManager: ServerTelemetryManager;
        authorityUrl?: string;
        azureCloudOptions?: AzureCloudOptions;
        extraQueryParameters?: StringDict;
        account?: AccountInfo;
    }): Promise<RefreshTokenClient> {
        // Create auth module.
        const clientConfig = await invokeAsync(
            this.getClientConfiguration.bind(this),
            PerformanceEvents.StandardInteractionClientGetClientConfiguration,
            this.logger,
            this.performanceClient,
            this.correlationId
        )({
            serverTelemetryManager: params.serverTelemetryManager,
            requestAuthority: params.authorityUrl,
            requestAzureCloudOptions: params.azureCloudOptions,
            requestExtraQueryParameters: params.extraQueryParameters,
            account: params.account,
        });
        return new RefreshTokenClient(clientConfig, this.performanceClient);
    }
}
