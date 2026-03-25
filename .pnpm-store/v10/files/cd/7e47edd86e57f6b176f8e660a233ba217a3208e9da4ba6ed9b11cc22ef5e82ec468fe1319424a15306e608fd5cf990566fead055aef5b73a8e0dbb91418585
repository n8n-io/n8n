/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { BaseClient } from './BaseClient.mjs';
import { addClientId, addRedirectUri, addScopes, addAuthorizationCode, addLibraryInfo, addApplicationTelemetry, addThrottling, addServerTelemetry, addCodeVerifier, addClientSecret, addClientAssertion, addClientAssertionType, addGrantType, addClientInfo, addPopToken, addSshJwk, addClaims, addCcsUpn, addCcsOid, addBrokerParameters, addExtraQueryParameters, instrumentBrokerParams, addPostLogoutRedirectUri, addCorrelationId, addIdTokenHint, addState, addLogoutHint, addInstanceAware } from '../request/RequestParameterBuilder.mjs';
import { mapToQueryString } from '../utils/UrlUtils.mjs';
import { Separators, AuthenticationScheme, HeaderNames, GrantType } from '../utils/Constants.mjs';
import { RETURN_SPA_CODE, CLIENT_ID } from '../constants/AADServerParamKeys.mjs';
import { isOidcProtocolMode } from '../config/ClientConfiguration.mjs';
import { ResponseHandler } from '../response/ResponseHandler.mjs';
import { StringUtils } from '../utils/StringUtils.mjs';
import { createClientAuthError } from '../error/ClientAuthError.mjs';
import { UrlString } from '../url/UrlString.mjs';
import { PopTokenGenerator } from '../crypto/PopTokenGenerator.mjs';
import { nowSeconds } from '../utils/TimeUtils.mjs';
import { buildClientInfo, buildClientInfoFromHomeAccountId } from '../account/ClientInfo.mjs';
import { CcsCredentialType } from '../account/CcsCredential.mjs';
import { createClientConfigurationError } from '../error/ClientConfigurationError.mjs';
import { PerformanceEvents } from '../telemetry/performance/PerformanceEvent.mjs';
import { invokeAsync } from '../utils/FunctionWrappers.mjs';
import { getClientAssertion } from '../utils/ClientAssertionUtils.mjs';
import { getRequestThumbprint } from '../network/RequestThumbprint.mjs';
import { requestCannotBeMade } from '../error/ClientAuthErrorCodes.mjs';
import { logoutRequestEmpty, redirectUriEmpty, missingSshJwk } from '../error/ClientConfigurationErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Oauth2.0 Authorization Code client
 * @internal
 */
class AuthorizationCodeClient extends BaseClient {
    constructor(configuration, performanceClient) {
        super(configuration, performanceClient);
        // Flag to indicate if client is for hybrid spa auth code redemption
        this.includeRedirectUri = true;
        this.oidcDefaultScopes =
            this.config.authOptions.authority.options.OIDCOptions?.defaultScopes;
    }
    /**
     * API to acquire a token in exchange of 'authorization_code` acquired by the user in the first leg of the
     * authorization_code_grant
     * @param request
     */
    async acquireToken(request, authCodePayload) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientAcquireToken, request.correlationId);
        if (!request.code) {
            throw createClientAuthError(requestCannotBeMade);
        }
        const reqTimestamp = nowSeconds();
        const response = await invokeAsync(this.executeTokenRequest.bind(this), PerformanceEvents.AuthClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(this.authority, request);
        // Retrieve requestId from response headers
        const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin, this.performanceClient);
        // Validate response. This function throws a server error if an error is returned by the server.
        responseHandler.validateTokenResponse(response.body);
        return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, authCodePayload, undefined, undefined, undefined, requestId);
    }
    /**
     * Used to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param authorityUri
     */
    getLogoutUri(logoutRequest) {
        // Throw error if logoutRequest is null/undefined
        if (!logoutRequest) {
            throw createClientConfigurationError(logoutRequestEmpty);
        }
        const queryString = this.createLogoutUrlQueryString(logoutRequest);
        // Construct logout URI
        return UrlString.appendQueryString(this.authority.endSessionEndpoint, queryString);
    }
    /**
     * Executes POST request to token endpoint
     * @param authority
     * @param request
     */
    async executeTokenRequest(authority, request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientExecuteTokenRequest, request.correlationId);
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
        const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), PerformanceEvents.AuthClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
        let ccsCredential = undefined;
        if (request.clientInfo) {
            try {
                const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
                ccsCredential = {
                    credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
                    type: CcsCredentialType.HOME_ACCOUNT_ID,
                };
            }
            catch (e) {
                this.logger.verbose("Could not parse client info for CCS Header: " + e);
            }
        }
        const headers = this.createTokenRequestHeaders(ccsCredential || request.ccsCredential);
        const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
        return invokeAsync(this.executePostToTokenEndpoint.bind(this), PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint);
    }
    /**
     * Generates a map for all the params to be sent to the service
     * @param request
     */
    async createTokenRequestBody(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientCreateTokenRequestBody, request.correlationId);
        const parameters = new Map();
        addClientId(parameters, request.embeddedClientId ||
            request.tokenBodyParameters?.[CLIENT_ID] ||
            this.config.authOptions.clientId);
        /*
         * For hybrid spa flow, there will be a code but no verifier
         * In this scenario, don't include redirect uri as auth code will not be bound to redirect URI
         */
        if (!this.includeRedirectUri) {
            // Just validate
            if (!request.redirectUri) {
                throw createClientConfigurationError(redirectUriEmpty);
            }
        }
        else {
            // Validate and include redirect uri
            addRedirectUri(parameters, request.redirectUri);
        }
        // Add scope array, parameter builder will add default scopes and dedupe
        addScopes(parameters, request.scopes, true, this.oidcDefaultScopes);
        // add code: user set, not validated
        addAuthorizationCode(parameters, request.code);
        // Add library metadata
        addLibraryInfo(parameters, this.config.libraryInfo);
        addApplicationTelemetry(parameters, this.config.telemetry.application);
        addThrottling(parameters);
        if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) {
            addServerTelemetry(parameters, this.serverTelemetryManager);
        }
        // add code_verifier if passed
        if (request.codeVerifier) {
            addCodeVerifier(parameters, request.codeVerifier);
        }
        if (this.config.clientCredentials.clientSecret) {
            addClientSecret(parameters, this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
            addClientAssertionType(parameters, clientAssertion.assertionType);
        }
        addGrantType(parameters, GrantType.AUTHORIZATION_CODE_GRANT);
        addClientInfo(parameters);
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
            let reqCnfData;
            if (!request.popKid) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
            }
            else {
                reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
            }
            // SPA PoP requires full Base64Url encoded req_cnf string (unhashed)
            addPopToken(parameters, reqCnfData);
        }
        else if (request.authenticationScheme === AuthenticationScheme.SSH) {
            if (request.sshJwk) {
                addSshJwk(parameters, request.sshJwk);
            }
            else {
                throw createClientConfigurationError(missingSshJwk);
            }
        }
        if (!StringUtils.isEmptyObj(request.claims) ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        let ccsCred = undefined;
        if (request.clientInfo) {
            try {
                const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
                ccsCred = {
                    credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
                    type: CcsCredentialType.HOME_ACCOUNT_ID,
                };
            }
            catch (e) {
                this.logger.verbose("Could not parse client info for CCS Header: " + e);
            }
        }
        else {
            ccsCred = request.ccsCredential;
        }
        // Adds these as parameters in the request instead of headers to prevent CORS preflight request
        if (this.config.systemOptions.preventCorsPreflight && ccsCred) {
            switch (ccsCred.type) {
                case CcsCredentialType.HOME_ACCOUNT_ID:
                    try {
                        const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
                        addCcsOid(parameters, clientInfo);
                    }
                    catch (e) {
                        this.logger.verbose("Could not parse home account ID for CCS Header: " +
                            e);
                    }
                    break;
                case CcsCredentialType.UPN:
                    addCcsUpn(parameters, ccsCred.credential);
                    break;
            }
        }
        if (request.embeddedClientId) {
            addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
        }
        if (request.tokenBodyParameters) {
            addExtraQueryParameters(parameters, request.tokenBodyParameters);
        }
        // Add hybrid spa parameters if not already provided
        if (request.enableSpaAuthorizationCode &&
            (!request.tokenBodyParameters ||
                !request.tokenBodyParameters[RETURN_SPA_CODE])) {
            addExtraQueryParameters(parameters, {
                [RETURN_SPA_CODE]: "1",
            });
        }
        instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
        return mapToQueryString(parameters);
    }
    /**
     * This API validates the `EndSessionRequest` and creates a URL
     * @param request
     */
    createLogoutUrlQueryString(request) {
        const parameters = new Map();
        if (request.postLogoutRedirectUri) {
            addPostLogoutRedirectUri(parameters, request.postLogoutRedirectUri);
        }
        if (request.correlationId) {
            addCorrelationId(parameters, request.correlationId);
        }
        if (request.idTokenHint) {
            addIdTokenHint(parameters, request.idTokenHint);
        }
        if (request.state) {
            addState(parameters, request.state);
        }
        if (request.logoutHint) {
            addLogoutHint(parameters, request.logoutHint);
        }
        if (request.extraQueryParameters) {
            addExtraQueryParameters(parameters, request.extraQueryParameters);
        }
        if (this.config.authOptions.instanceAware) {
            addInstanceAware(parameters);
        }
        return mapToQueryString(parameters, this.config.authOptions.encodeExtraQueryParams, request.extraQueryParameters);
    }
}

export { AuthorizationCodeClient };
//# sourceMappingURL=AuthorizationCodeClient.mjs.map
