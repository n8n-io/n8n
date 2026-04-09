/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccessTokenEntity,
    AuthenticationResult,
    AuthenticationScheme,
    Authority,
    BaseClient,
    CacheManager,
    CacheOutcome,
    ClientAuthErrorCodes,
    ClientConfiguration,
    CommonClientCredentialRequest,
    Constants,
    CredentialFilter,
    CredentialType,
    DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
    GrantType,
    IAppTokenProvider,
    ICrypto,
    RequestParameterBuilder,
    RequestThumbprint,
    ResponseHandler,
    ScopeSet,
    ServerAuthorizationTokenResponse,
    ServerTelemetryManager,
    StringUtils,
    TimeUtils,
    TokenCacheContext,
    UrlString,
    createClientAuthError,
    ClientAssertion,
    getClientAssertion,
    UrlUtils,
} from "@azure/msal-common/node";
import {
    ManagedIdentityConfiguration,
    ManagedIdentityNodeConfiguration,
} from "../config/Configuration.js";
import { ApiId } from "../utils/Constants.js";

/**
 * OAuth2.0 client credential grant
 * @public
 */
export class ClientCredentialClient extends BaseClient {
    private readonly appTokenProvider?: IAppTokenProvider;

    constructor(
        configuration: ClientConfiguration,
        appTokenProvider?: IAppTokenProvider
    ) {
        super(configuration);
        this.appTokenProvider = appTokenProvider;
    }

    /**
     * Public API to acquire a token with ClientCredential Flow for Confidential clients
     * @param request - CommonClientCredentialRequest provided by the developer
     */
    public async acquireToken(
        request: CommonClientCredentialRequest
    ): Promise<AuthenticationResult | null> {
        if (request.skipCache || request.claims) {
            return this.executeTokenRequest(request, this.authority);
        }

        const [cachedAuthenticationResult, lastCacheOutcome] =
            await this.getCachedAuthenticationResult(
                request,
                this.config,
                this.cryptoUtils,
                this.authority,
                this.cacheManager,
                this.serverTelemetryManager
            );

        if (cachedAuthenticationResult) {
            // if the token is not expired but must be refreshed; get a new one in the background
            if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
                this.logger.info(
                    "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed."
                );

                // refresh the access token in the background
                const refreshAccessToken = true;
                await this.executeTokenRequest(
                    request,
                    this.authority,
                    refreshAccessToken
                );
            }

            // return the cached token
            return cachedAuthenticationResult;
        } else {
            return this.executeTokenRequest(request, this.authority);
        }
    }

    /**
     * looks up cache if the tokens are cached already
     */
    public async getCachedAuthenticationResult(
        request: CommonClientCredentialRequest,
        config: ClientConfiguration | ManagedIdentityConfiguration,
        cryptoUtils: ICrypto,
        authority: Authority,
        cacheManager: CacheManager,
        serverTelemetryManager?: ServerTelemetryManager | null
    ): Promise<[AuthenticationResult | null, CacheOutcome]> {
        const clientConfiguration = config as ClientConfiguration;
        const managedIdentityConfiguration =
            config as ManagedIdentityNodeConfiguration;

        let lastCacheOutcome: CacheOutcome = CacheOutcome.NOT_APPLICABLE;

        // read the user-supplied cache into memory, if applicable
        let cacheContext;
        if (
            clientConfiguration.serializableCache &&
            clientConfiguration.persistencePlugin
        ) {
            cacheContext = new TokenCacheContext(
                clientConfiguration.serializableCache,
                false
            );
            await clientConfiguration.persistencePlugin.beforeCacheAccess(
                cacheContext
            );
        }

        const cachedAccessToken = this.readAccessTokenFromCache(
            authority,
            managedIdentityConfiguration.managedIdentityId?.id ||
                clientConfiguration.authOptions.clientId,
            new ScopeSet(request.scopes || []),
            cacheManager,
            request.correlationId
        );

        if (
            clientConfiguration.serializableCache &&
            clientConfiguration.persistencePlugin &&
            cacheContext
        ) {
            await clientConfiguration.persistencePlugin.afterCacheAccess(
                cacheContext
            );
        }

        // must refresh due to non-existent access_token
        if (!cachedAccessToken) {
            serverTelemetryManager?.setCacheOutcome(
                CacheOutcome.NO_CACHED_ACCESS_TOKEN
            );
            return [null, CacheOutcome.NO_CACHED_ACCESS_TOKEN];
        }

        // must refresh due to the expires_in value
        if (
            TimeUtils.isTokenExpired(
                cachedAccessToken.expiresOn,
                clientConfiguration.systemOptions?.tokenRenewalOffsetSeconds ||
                    DEFAULT_TOKEN_RENEWAL_OFFSET_SEC
            )
        ) {
            serverTelemetryManager?.setCacheOutcome(
                CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED
            );
            return [null, CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED];
        }

        // must refresh (in the background) due to the refresh_in value
        if (
            cachedAccessToken.refreshOn &&
            TimeUtils.isTokenExpired(cachedAccessToken.refreshOn.toString(), 0)
        ) {
            lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
            serverTelemetryManager?.setCacheOutcome(
                CacheOutcome.PROACTIVELY_REFRESHED
            );
        }

        return [
            await ResponseHandler.generateAuthenticationResult(
                cryptoUtils,
                authority,
                {
                    account: null,
                    idToken: null,
                    accessToken: cachedAccessToken,
                    refreshToken: null,
                    appMetadata: null,
                },
                true,
                request
            ),
            lastCacheOutcome,
        ];
    }

    /**
     * Reads access token from the cache
     */
    private readAccessTokenFromCache(
        authority: Authority,
        id: string,
        scopeSet: ScopeSet,
        cacheManager: CacheManager,
        correlationId: string
    ): AccessTokenEntity | null {
        const accessTokenFilter: CredentialFilter = {
            homeAccountId: Constants.EMPTY_STRING,
            environment:
                authority.canonicalAuthorityUrlComponents.HostNameAndPort,
            credentialType: CredentialType.ACCESS_TOKEN,
            clientId: id,
            realm: authority.tenant,
            target: ScopeSet.createSearchScopes(scopeSet.asArray()),
        };

        const accessTokens = cacheManager.getAccessTokensByFilter(
            accessTokenFilter,
            correlationId
        );
        if (accessTokens.length < 1) {
            return null;
        } else if (accessTokens.length > 1) {
            throw createClientAuthError(
                ClientAuthErrorCodes.multipleMatchingTokens
            );
        }
        return accessTokens[0] as AccessTokenEntity;
    }

    /**
     * Makes a network call to request the token from the service
     * @param request - CommonClientCredentialRequest provided by the developer
     * @param authority - authority object
     */
    private async executeTokenRequest(
        request: CommonClientCredentialRequest,
        authority: Authority,
        refreshAccessToken?: boolean
    ): Promise<AuthenticationResult | null> {
        let serverTokenResponse: ServerAuthorizationTokenResponse;
        let reqTimestamp: number;

        if (this.appTokenProvider) {
            this.logger.info("Using appTokenProvider extensibility.");

            const appTokenPropviderParameters = {
                correlationId: request.correlationId,
                tenantId: this.config.authOptions.authority.tenant,
                scopes: request.scopes,
                claims: request.claims,
            };

            reqTimestamp = TimeUtils.nowSeconds();
            const appTokenProviderResult = await this.appTokenProvider(
                appTokenPropviderParameters
            );

            serverTokenResponse = {
                access_token: appTokenProviderResult.accessToken,
                expires_in: appTokenProviderResult.expiresInSeconds,
                refresh_in: appTokenProviderResult.refreshInSeconds,
                token_type: AuthenticationScheme.BEARER,
            };
        } else {
            const queryParametersString =
                this.createTokenQueryParameters(request);
            const endpoint = UrlString.appendQueryString(
                authority.tokenEndpoint,
                queryParametersString
            );

            const requestBody = await this.createTokenRequestBody(request);
            const headers: Record<string, string> =
                this.createTokenRequestHeaders();
            const thumbprint: RequestThumbprint = {
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

            this.logger.info(
                "Sending token request to endpoint: " + authority.tokenEndpoint
            );

            reqTimestamp = TimeUtils.nowSeconds();
            const response = await this.executePostToTokenEndpoint(
                endpoint,
                requestBody,
                headers,
                thumbprint,
                request.correlationId
            );

            serverTokenResponse = response.body;
            serverTokenResponse.status = response.status;
        }

        const responseHandler = new ResponseHandler(
            this.config.authOptions.clientId,
            this.cacheManager,
            this.cryptoUtils,
            this.logger,
            this.config.serializableCache,
            this.config.persistencePlugin
        );

        responseHandler.validateTokenResponse(
            serverTokenResponse,
            refreshAccessToken
        );

        const tokenResponse = await responseHandler.handleServerTokenResponse(
            serverTokenResponse,
            this.authority,
            reqTimestamp,
            request,
            ApiId.acquireTokenByClientCredential
        );

        return tokenResponse;
    }

    /**
     * generate the request to the server in the acceptable format
     * @param request - CommonClientCredentialRequest provided by the developer
     */
    private async createTokenRequestBody(
        request: CommonClientCredentialRequest
    ): Promise<string> {
        const parameters = new Map<string, string>();

        RequestParameterBuilder.addClientId(
            parameters,
            this.config.authOptions.clientId
        );

        RequestParameterBuilder.addScopes(parameters, request.scopes, false);

        RequestParameterBuilder.addGrantType(
            parameters,
            GrantType.CLIENT_CREDENTIALS_GRANT
        );

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

        // Use clientAssertion from request, fallback to client assertion in base configuration
        const clientAssertion: ClientAssertion | undefined =
            request.clientAssertion ||
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

        return UrlUtils.mapToQueryString(parameters);
    }
}
