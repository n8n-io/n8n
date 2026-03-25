/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { BaseClient, ScopeSet, CacheOutcome, createClientAuthError, ClientAuthErrorCodes, TimeUtils, AuthToken, Constants, ResponseHandler, CredentialType, AuthenticationScheme, UrlString, RequestParameterBuilder, GrantType, AADServerParamKeys, getClientAssertion, UrlUtils } from '@azure/msal-common/node';
import { EncodingUtils } from '../utils/EncodingUtils.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * On-Behalf-Of client
 * @public
 */
class OnBehalfOfClient extends BaseClient {
    constructor(configuration) {
        super(configuration);
    }
    /**
     * Public API to acquire tokens with on behalf of flow
     * @param request - developer provided CommonOnBehalfOfRequest
     */
    async acquireToken(request) {
        this.scopeSet = new ScopeSet(request.scopes || []);
        // generate the user_assertion_hash for OBOAssertion
        this.userAssertionHash = await this.cryptoUtils.hashString(request.oboAssertion);
        if (request.skipCache || request.claims) {
            return this.executeTokenRequest(request, this.authority, this.userAssertionHash);
        }
        try {
            return await this.getCachedAuthenticationResult(request);
        }
        catch (e) {
            // Any failure falls back to interactive request, once we implement distributed cache, we plan to handle `createRefreshRequiredError` to refresh using the RT
            return await this.executeTokenRequest(request, this.authority, this.userAssertionHash);
        }
    }
    /**
     * look up cache for tokens
     * Find idtoken in the cache
     * Find accessToken based on user assertion and account info in the cache
     * Please note we are not yet supported OBO tokens refreshed with long lived RT. User will have to send a new assertion if the current access token expires
     * This is to prevent security issues when the assertion changes over time, however, longlived RT helps retaining the session
     * @param request - developer provided CommonOnBehalfOfRequest
     */
    async getCachedAuthenticationResult(request) {
        // look in the cache for the access_token which matches the incoming_assertion
        const cachedAccessToken = this.readAccessTokenFromCacheForOBO(this.config.authOptions.clientId, request);
        if (!cachedAccessToken) {
            // Must refresh due to non-existent access_token.
            this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN);
            this.logger.info("SilentFlowClient:acquireCachedToken - No access token found in cache for the given properties.");
            throw createClientAuthError(ClientAuthErrorCodes.tokenRefreshRequired);
        }
        else if (TimeUtils.isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
            // Access token expired, will need to renewed
            this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED);
            this.logger.info(`OnbehalfofFlow:getCachedAuthenticationResult - Cached access token is expired or will expire within ${this.config.systemOptions.tokenRenewalOffsetSeconds} seconds.`);
            throw createClientAuthError(ClientAuthErrorCodes.tokenRefreshRequired);
        }
        // fetch the idToken from cache
        const cachedIdToken = this.readIdTokenFromCacheForOBO(cachedAccessToken.homeAccountId, request.correlationId);
        let idTokenClaims;
        let cachedAccount = null;
        if (cachedIdToken) {
            idTokenClaims = AuthToken.extractTokenClaims(cachedIdToken.secret, EncodingUtils.base64Decode);
            const localAccountId = idTokenClaims.oid || idTokenClaims.sub;
            const accountInfo = {
                homeAccountId: cachedIdToken.homeAccountId,
                environment: cachedIdToken.environment,
                tenantId: cachedIdToken.realm,
                username: Constants.EMPTY_STRING,
                localAccountId: localAccountId || Constants.EMPTY_STRING,
            };
            cachedAccount = this.cacheManager.getAccount(this.cacheManager.generateAccountKey(accountInfo), request.correlationId);
        }
        // increment telemetry cache hit counter
        if (this.config.serverTelemetryManager) {
            this.config.serverTelemetryManager.incrementCacheHits();
        }
        return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, {
            account: cachedAccount,
            accessToken: cachedAccessToken,
            idToken: cachedIdToken,
            refreshToken: null,
            appMetadata: null,
        }, true, request, idTokenClaims);
    }
    /**
     * read idtoken from cache, this is a specific implementation for OBO as the requirements differ from a generic lookup in the cacheManager
     * Certain use cases of OBO flow do not expect an idToken in the cache/or from the service
     * @param atHomeAccountId - account id
     */
    readIdTokenFromCacheForOBO(atHomeAccountId, correlationId) {
        const idTokenFilter = {
            homeAccountId: atHomeAccountId,
            environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
            credentialType: CredentialType.ID_TOKEN,
            clientId: this.config.authOptions.clientId,
            realm: this.authority.tenant,
        };
        const idTokenMap = this.cacheManager.getIdTokensByFilter(idTokenFilter, correlationId);
        // When acquiring a token on behalf of an application, there might not be an id token in the cache
        if (Object.values(idTokenMap).length < 1) {
            return null;
        }
        return Object.values(idTokenMap)[0];
    }
    /**
     * Fetches the cached access token based on incoming assertion
     * @param clientId - client id
     * @param request - developer provided CommonOnBehalfOfRequest
     */
    readAccessTokenFromCacheForOBO(clientId, request) {
        const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
        /*
         * Distinguish between Bearer and PoP/SSH token cache types
         * Cast to lowercase to handle "bearer" from ADFS
         */
        const credentialType = authScheme &&
            authScheme.toLowerCase() !==
                AuthenticationScheme.BEARER.toLowerCase()
            ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME
            : CredentialType.ACCESS_TOKEN;
        const accessTokenFilter = {
            credentialType: credentialType,
            clientId,
            target: ScopeSet.createSearchScopes(this.scopeSet.asArray()),
            tokenType: authScheme,
            keyId: request.sshKid,
            requestedClaimsHash: request.requestedClaimsHash,
            userAssertionHash: this.userAssertionHash,
        };
        const accessTokens = this.cacheManager.getAccessTokensByFilter(accessTokenFilter, request.correlationId);
        const numAccessTokens = accessTokens.length;
        if (numAccessTokens < 1) {
            return null;
        }
        else if (numAccessTokens > 1) {
            throw createClientAuthError(ClientAuthErrorCodes.multipleMatchingTokens);
        }
        return accessTokens[0];
    }
    /**
     * Make a network call to the server requesting credentials
     * @param request - developer provided CommonOnBehalfOfRequest
     * @param authority - authority object
     */
    async executeTokenRequest(request, authority, userAssertionHash) {
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
        const requestBody = await this.createTokenRequestBody(request);
        const headers = this.createTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: request.authority,
            scopes: request.scopes,
            claims: request.claims,
            authenticationScheme: request.authenticationScheme,
            resourceRequestMethod: request.resourceRequestMethod,
            resourceRequestUri: request.resourceRequestUri,
            shrClaims: request.shrClaims,
            sshKid: request.sshKid,
        };
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        const tokenResponse = await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, undefined, userAssertionHash);
        return tokenResponse;
    }
    /**
     * generate a server request in accepable format
     * @param request - developer provided CommonOnBehalfOfRequest
     */
    async createTokenRequestBody(request) {
        const parameters = new Map();
        RequestParameterBuilder.addClientId(parameters, this.config.authOptions.clientId);
        RequestParameterBuilder.addScopes(parameters, request.scopes);
        RequestParameterBuilder.addGrantType(parameters, GrantType.JWT_BEARER);
        RequestParameterBuilder.addClientInfo(parameters);
        RequestParameterBuilder.addLibraryInfo(parameters, this.config.libraryInfo);
        RequestParameterBuilder.addApplicationTelemetry(parameters, this.config.telemetry.application);
        RequestParameterBuilder.addThrottling(parameters);
        if (this.serverTelemetryManager) {
            RequestParameterBuilder.addServerTelemetry(parameters, this.serverTelemetryManager);
        }
        const correlationId = request.correlationId ||
            this.config.cryptoInterface.createNewGuid();
        RequestParameterBuilder.addCorrelationId(parameters, correlationId);
        RequestParameterBuilder.addRequestTokenUse(parameters, AADServerParamKeys.ON_BEHALF_OF);
        RequestParameterBuilder.addOboAssertion(parameters, request.oboAssertion);
        if (this.config.clientCredentials.clientSecret) {
            RequestParameterBuilder.addClientSecret(parameters, this.config.clientCredentials.clientSecret);
        }
        const clientAssertion = this.config.clientCredentials.clientAssertion;
        if (clientAssertion) {
            RequestParameterBuilder.addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
            RequestParameterBuilder.addClientAssertionType(parameters, clientAssertion.assertionType);
        }
        if (request.claims ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            RequestParameterBuilder.addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        return UrlUtils.mapToQueryString(parameters);
    }
}

export { OnBehalfOfClient };
//# sourceMappingURL=OnBehalfOfClient.mjs.map
