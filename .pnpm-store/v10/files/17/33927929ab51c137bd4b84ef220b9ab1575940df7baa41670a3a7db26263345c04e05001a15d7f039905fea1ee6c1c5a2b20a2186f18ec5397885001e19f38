/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthenticationResult,
    Authority,
    BaseClient,
    CcsCredentialType,
    ClientAssertion,
    ClientConfiguration,
    CommonUsernamePasswordRequest,
    GrantType,
    NetworkResponse,
    OAuthResponseType,
    RequestParameterBuilder,
    RequestThumbprint,
    ResponseHandler,
    ServerAuthorizationTokenResponse,
    StringUtils,
    TimeUtils,
    UrlString,
    UrlUtils,
    getClientAssertion,
} from "@azure/msal-common/node";
import { ApiId } from "../utils/Constants.js";

/**
 * Oauth2.0 Password grant client
 * Note: We are only supporting public clients for password grant and for purely testing purposes
 * @public
 * @deprecated - Use a more secure flow instead
 */
export class UsernamePasswordClient extends BaseClient {
    constructor(configuration: ClientConfiguration) {
        super(configuration);
    }

    /**
     * API to acquire a token by passing the username and password to the service in exchage of credentials
     * password_grant
     * @param request - CommonUsernamePasswordRequest
     */
    async acquireToken(
        request: CommonUsernamePasswordRequest
    ): Promise<AuthenticationResult | null> {
        this.logger.info("in acquireToken call in username-password client");

        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executeTokenRequest(
            this.authority,
            request
        );

        const responseHandler = new ResponseHandler(
            this.config.authOptions.clientId,
            this.cacheManager,
            this.cryptoUtils,
            this.logger,
            this.config.serializableCache,
            this.config.persistencePlugin
        );

        // Validate response. This function throws a server error if an error is returned by the server.
        responseHandler.validateTokenResponse(response.body);
        const tokenResponse = responseHandler.handleServerTokenResponse(
            response.body,
            this.authority,
            reqTimestamp,
            request,
            ApiId.acquireTokenByUsernamePassword
        );

        return tokenResponse;
    }

    /**
     * Executes POST request to token endpoint
     * @param authority - authority object
     * @param request - CommonUsernamePasswordRequest provided by the developer
     */
    private async executeTokenRequest(
        authority: Authority,
        request: CommonUsernamePasswordRequest
    ): Promise<NetworkResponse<ServerAuthorizationTokenResponse>> {
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(
            authority.tokenEndpoint,
            queryParametersString
        );
        const requestBody = await this.createTokenRequestBody(request);
        const headers: Record<string, string> = this.createTokenRequestHeaders({
            credential: request.username,
            type: CcsCredentialType.UPN,
        });
        const thumbprint: RequestThumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: authority.canonicalAuthority,
            scopes: request.scopes,
            claims: request.claims,
            authenticationScheme: request.authenticationScheme,
            resourceRequestMethod: request.resourceRequestMethod,
            resourceRequestUri: request.resourceRequestUri,
            shrClaims: request.shrClaims,
            sshKid: request.sshKid,
        };

        return this.executePostToTokenEndpoint(
            endpoint,
            requestBody,
            headers,
            thumbprint,
            request.correlationId
        );
    }

    /**
     * Generates a map for all the params to be sent to the service
     * @param request - CommonUsernamePasswordRequest provided by the developer
     */
    private async createTokenRequestBody(
        request: CommonUsernamePasswordRequest
    ): Promise<string> {
        const parameters = new Map<string, string>();

        RequestParameterBuilder.addClientId(
            parameters,
            this.config.authOptions.clientId
        );
        RequestParameterBuilder.addUsername(parameters, request.username);
        RequestParameterBuilder.addPassword(parameters, request.password);

        RequestParameterBuilder.addScopes(parameters, request.scopes);

        RequestParameterBuilder.addResponseType(
            parameters,
            OAuthResponseType.IDTOKEN_TOKEN
        );

        RequestParameterBuilder.addGrantType(
            parameters,
            GrantType.RESOURCE_OWNER_PASSWORD_GRANT
        );
        RequestParameterBuilder.addClientInfo(parameters);

        RequestParameterBuilder.addLibraryInfo(
            parameters,
            this.config.libraryInfo
        );
        RequestParameterBuilder.addApplicationTelemetry(
            parameters,
            this.config.telemetry.application
        );
        RequestParameterBuilder.addThrottling(parameters);

        if (this.serverTelemetryManager) {
            RequestParameterBuilder.addServerTelemetry(
                parameters,
                this.serverTelemetryManager
            );
        }

        const correlationId =
            request.correlationId ||
            this.config.cryptoInterface.createNewGuid();
        RequestParameterBuilder.addCorrelationId(parameters, correlationId);

        if (this.config.clientCredentials.clientSecret) {
            RequestParameterBuilder.addClientSecret(
                parameters,
                this.config.clientCredentials.clientSecret
            );
        }

        const clientAssertion: ClientAssertion | undefined =
            this.config.clientCredentials.clientAssertion;

        if (clientAssertion) {
            RequestParameterBuilder.addClientAssertion(
                parameters,
                await getClientAssertion(
                    clientAssertion.assertion,
                    this.config.authOptions.clientId,
                    request.resourceRequestUri
                )
            );
            RequestParameterBuilder.addClientAssertionType(
                parameters,
                clientAssertion.assertionType
            );
        }

        if (
            !StringUtils.isEmptyObj(request.claims) ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)
        ) {
            RequestParameterBuilder.addClaims(
                parameters,
                request.claims,
                this.config.authOptions.clientCapabilities
            );
        }

        if (
            this.config.systemOptions.preventCorsPreflight &&
            request.username
        ) {
            RequestParameterBuilder.addCcsUpn(parameters, request.username);
        }

        return UrlUtils.mapToQueryString(parameters);
    }
}
