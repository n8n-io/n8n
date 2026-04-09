/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthorizationCodePayload,
    CommonAuthorizationCodeRequest,
    AuthorizationCodeClient,
    CcsCredential,
    Logger,
    ServerError,
    IPerformanceClient,
    PerformanceEvents,
    invokeAsync,
    CcsCredentialType,
    AuthorizeResponse,
    AuthorizeProtocol,
    CommonAuthorizationUrlRequest,
} from "@azure/msal-common/browser";

import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ApiId } from "../utils/BrowserConstants.js";

/**
 * Abstract class which defines operations for a browser interaction handling class.
 */
export class InteractionHandler {
    protected authModule: AuthorizationCodeClient;
    protected browserStorage: BrowserCacheManager;
    protected authCodeRequest: CommonAuthorizationCodeRequest;
    protected logger: Logger;
    protected performanceClient: IPerformanceClient;

    constructor(
        authCodeModule: AuthorizationCodeClient,
        storageImpl: BrowserCacheManager,
        authCodeRequest: CommonAuthorizationCodeRequest,
        logger: Logger,
        performanceClient: IPerformanceClient
    ) {
        this.authModule = authCodeModule;
        this.browserStorage = storageImpl;
        this.authCodeRequest = authCodeRequest;
        this.logger = logger;
        this.performanceClient = performanceClient;
    }

    /**
     * Function to handle response parameters from hash.
     * @param locationHash
     */
    async handleCodeResponse(
        response: AuthorizeResponse,
        request: CommonAuthorizationUrlRequest,
        apiId: ApiId
    ): Promise<AuthenticationResult> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.HandleCodeResponse,
            request.correlationId
        );

        let authCodeResponse;
        try {
            authCodeResponse = AuthorizeProtocol.getAuthorizationCodePayload(
                response,
                request.state
            );
        } catch (e) {
            if (
                e instanceof ServerError &&
                e.subError === BrowserAuthErrorCodes.userCancelled
            ) {
                // Translate server error caused by user closing native prompt to corresponding first class MSAL error
                throw createBrowserAuthError(
                    BrowserAuthErrorCodes.userCancelled
                );
            } else {
                throw e;
            }
        }

        return invokeAsync(
            this.handleCodeResponseFromServer.bind(this),
            PerformanceEvents.HandleCodeResponseFromServer,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(authCodeResponse, request, apiId);
    }

    /**
     * Process auth code response from AAD
     * @param authCodeResponse
     * @param state
     * @param authority
     * @param networkModule
     * @returns
     */
    async handleCodeResponseFromServer(
        authCodeResponse: AuthorizationCodePayload,
        request: CommonAuthorizationUrlRequest,
        apiId: ApiId,
        validateNonce: boolean = true
    ): Promise<AuthenticationResult> {
        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.HandleCodeResponseFromServer,
            request.correlationId
        );
        this.logger.trace(
            "InteractionHandler.handleCodeResponseFromServer called"
        );

        // Assign code to request
        this.authCodeRequest.code = authCodeResponse.code;

        // Check for new cloud instance
        if (authCodeResponse.cloud_instance_host_name) {
            await invokeAsync(
                this.authModule.updateAuthority.bind(this.authModule),
                PerformanceEvents.UpdateTokenEndpointAuthority,
                this.logger,
                this.performanceClient,
                request.correlationId
            )(authCodeResponse.cloud_instance_host_name, request.correlationId);
        }

        // Nonce validation not needed when redirect not involved (e.g. hybrid spa, renewing token via rt)
        if (validateNonce) {
            // TODO: Assigning "response nonce" to "request nonce" is confusing. Refactor the function doing validation to accept request nonce directly
            authCodeResponse.nonce = request.nonce || undefined;
        }

        authCodeResponse.state = request.state;

        // Add CCS parameters if available
        if (authCodeResponse.client_info) {
            this.authCodeRequest.clientInfo = authCodeResponse.client_info;
        } else {
            const ccsCred = this.createCcsCredentials(request);
            if (ccsCred) {
                this.authCodeRequest.ccsCredential = ccsCred;
            }
        }

        // Acquire token with retrieved code.
        const tokenResponse = (await invokeAsync(
            this.authModule.acquireToken.bind(this.authModule),
            PerformanceEvents.AuthClientAcquireToken,
            this.logger,
            this.performanceClient,
            request.correlationId
        )(
            this.authCodeRequest,
            apiId,
            authCodeResponse
        )) as AuthenticationResult;
        return tokenResponse;
    }

    /**
     * Build ccs creds if available
     */
    protected createCcsCredentials(
        request: CommonAuthorizationUrlRequest
    ): CcsCredential | null {
        if (request.account) {
            return {
                credential: request.account.homeAccountId,
                type: CcsCredentialType.HOME_ACCOUNT_ID,
            };
        } else if (request.loginHint) {
            return {
                credential: request.loginHint,
                type: CcsCredentialType.UPN,
            };
        }

        return null;
    }
}
