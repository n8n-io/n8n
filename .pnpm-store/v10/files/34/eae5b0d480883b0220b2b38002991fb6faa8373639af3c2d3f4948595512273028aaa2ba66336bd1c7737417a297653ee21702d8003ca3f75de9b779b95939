/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccessTokenEntity,
    ICrypto,
    IdTokenEntity,
    Logger,
    ScopeSet,
    Authority,
    AuthorityFactory,
    AuthorityOptions,
    ExternalTokenResponse,
    AccountEntity,
    AuthToken,
    RefreshTokenEntity,
    CacheRecord,
    TokenClaims,
    CacheHelpers,
    buildAccountToCache,
    TimeUtils,
    IPerformanceClient,
    PerformanceEvents,
    invokeAsync,
} from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import type { SilentRequest } from "../request/SilentRequest.js";
import { BrowserCacheManager } from "./BrowserCacheManager.js";
import type { ITokenCache } from "./ITokenCache.js";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import type { AuthenticationResult } from "../response/AuthenticationResult.js";
import { base64Decode } from "../encode/Base64Decode.js";
import * as BrowserCrypto from "../crypto/BrowserCrypto.js";
import { ApiId } from "../utils/BrowserConstants.js";

export type LoadTokenOptions = {
    clientInfo?: string;
    expiresOn?: number;
    extendedExpiresOn?: number;
};

/**
 * Token cache manager
 */
export class TokenCache implements ITokenCache {
    // Flag to indicate if in browser environment
    public isBrowserEnvironment: boolean;
    // Input configuration by developer/user
    protected config: BrowserConfiguration;
    // Browser cache storage
    private storage: BrowserCacheManager;
    // Logger
    private logger: Logger;
    // Crypto class
    private cryptoObj: ICrypto;
    // Perf client
    private performanceClient: IPerformanceClient;

    constructor(
        configuration: BrowserConfiguration,
        storage: BrowserCacheManager,
        logger: Logger,
        cryptoObj: ICrypto,
        performanceClient: IPerformanceClient
    ) {
        this.isBrowserEnvironment = typeof window !== "undefined";
        this.config = configuration;
        this.storage = storage;
        this.logger = logger;
        this.cryptoObj = cryptoObj;
        this.performanceClient = performanceClient;
    }

    // Move getAllAccounts here and cache utility APIs

    /**
     * API to load tokens to msal-browser cache.
     * @param request
     * @param response
     * @param options
     * @returns `AuthenticationResult` for the response that was loaded.
     */
    async loadExternalTokens(
        request: SilentRequest,
        response: ExternalTokenResponse,
        options: LoadTokenOptions
    ): Promise<AuthenticationResult> {
        if (!this.isBrowserEnvironment) {
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.nonBrowserEnvironment
            );
        }

        const correlationId =
            request.correlationId || BrowserCrypto.createNewGuid();

        const rootMeasurement = this.performanceClient.startMeasurement(
            PerformanceEvents.LoadExternalTokens,
            correlationId
        );

        try {
            const idTokenClaims = response.id_token
                ? AuthToken.extractTokenClaims(response.id_token, base64Decode)
                : undefined;
            const kmsi = AuthToken.isKmsi(idTokenClaims || {});

            const authorityOptions: AuthorityOptions = {
                protocolMode: this.config.auth.protocolMode,
                knownAuthorities: this.config.auth.knownAuthorities,
                cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
                authorityMetadata: this.config.auth.authorityMetadata,
                skipAuthorityMetadataCache:
                    this.config.auth.skipAuthorityMetadataCache,
            };
            const authorityString =
                request.authority || this.config.auth.authority;
            const authority = await AuthorityFactory.createDiscoveredInstance(
                Authority.generateAuthority(
                    authorityString,
                    request.azureCloudOptions
                ),
                this.config.system.networkClient,
                this.storage,
                authorityOptions,
                this.logger,
                correlationId,
                this.performanceClient
            );

            const cacheRecordAccount: AccountEntity = await invokeAsync(
                this.loadAccount.bind(this),
                PerformanceEvents.LoadAccount,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                request,
                options.clientInfo || response.client_info || "",
                correlationId,
                authority,
                idTokenClaims
            );

            const idToken = await invokeAsync(
                this.loadIdToken.bind(this),
                PerformanceEvents.LoadIdToken,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                response,
                cacheRecordAccount.homeAccountId,
                cacheRecordAccount.environment,
                cacheRecordAccount.realm,
                correlationId,
                kmsi
            );

            const accessToken = await invokeAsync(
                this.loadAccessToken.bind(this),
                PerformanceEvents.LoadAccessToken,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                request,
                response,
                cacheRecordAccount.homeAccountId,
                cacheRecordAccount.environment,
                cacheRecordAccount.realm,
                options,
                correlationId,
                kmsi
            );

            const refreshToken = await invokeAsync(
                this.loadRefreshToken.bind(this),
                PerformanceEvents.LoadRefreshToken,
                this.logger,
                this.performanceClient,
                correlationId
            )(
                response,
                cacheRecordAccount.homeAccountId,
                cacheRecordAccount.environment,
                correlationId,
                kmsi
            );

            rootMeasurement.end(
                { success: true },
                undefined,
                AccountEntity.getAccountInfo(cacheRecordAccount)
            );

            return this.generateAuthenticationResult(
                request,
                {
                    account: cacheRecordAccount,
                    idToken,
                    accessToken,
                    refreshToken,
                },
                authority,
                idTokenClaims
            );
        } catch (error) {
            rootMeasurement.end({ success: false }, error);
            throw error;
        }
    }

    /**
     * Helper function to load account to msal-browser cache
     * @param idToken
     * @param environment
     * @param clientInfo
     * @param authorityType
     * @param requestHomeAccountId
     * @returns `AccountEntity`
     */
    private async loadAccount(
        request: SilentRequest,
        clientInfo: string,
        correlationId: string,
        authority: Authority,
        idTokenClaims?: TokenClaims
    ): Promise<AccountEntity> {
        this.logger.verbose("TokenCache - loading account");

        if (request.account) {
            const accountEntity = AccountEntity.createFromAccountInfo(
                request.account
            );
            await this.storage.setAccount(
                accountEntity,
                correlationId,
                AuthToken.isKmsi(idTokenClaims || {}),
                ApiId.loadExternalTokens
            );
            return accountEntity;
        } else if (!clientInfo && !idTokenClaims) {
            this.logger.error(
                "TokenCache - if an account is not provided on the request, clientInfo or idToken must be provided instead."
            );
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.unableToLoadToken
            );
        }

        const homeAccountId = AccountEntity.generateHomeAccountId(
            clientInfo,
            authority.authorityType,
            this.logger,
            this.cryptoObj,
            idTokenClaims
        );

        const claimsTenantId = idTokenClaims?.tid;

        const cachedAccount = buildAccountToCache(
            this.storage,
            authority,
            homeAccountId,
            base64Decode,
            correlationId,
            idTokenClaims,
            clientInfo,
            authority.getPreferredCache(),
            claimsTenantId,
            undefined, // authCodePayload
            undefined, // nativeAccountId
            this.logger
        );

        await this.storage.setAccount(
            cachedAccount,
            correlationId,
            AuthToken.isKmsi(idTokenClaims || {}),
            ApiId.loadExternalTokens
        );
        return cachedAccount;
    }

    /**
     * Helper function to load id tokens to msal-browser cache
     * @param idToken
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `IdTokenEntity`
     */
    private async loadIdToken(
        response: ExternalTokenResponse,
        homeAccountId: string,
        environment: string,
        tenantId: string,
        correlationId: string,
        kmsi: boolean
    ): Promise<IdTokenEntity | null> {
        if (!response.id_token) {
            this.logger.verbose("TokenCache - no id token found in response");
            return null;
        }

        this.logger.verbose("TokenCache - loading id token");
        const idTokenEntity = CacheHelpers.createIdTokenEntity(
            homeAccountId,
            environment,
            response.id_token,
            this.config.auth.clientId,
            tenantId
        );

        await this.storage.setIdTokenCredential(
            idTokenEntity,
            correlationId,
            kmsi
        );
        return idTokenEntity;
    }

    /**
     * Helper function to load access tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `AccessTokenEntity`
     */
    private async loadAccessToken(
        request: SilentRequest,
        response: ExternalTokenResponse,
        homeAccountId: string,
        environment: string,
        tenantId: string,
        options: LoadTokenOptions,
        correlationId: string,
        kmsi: boolean
    ): Promise<AccessTokenEntity | null> {
        if (!response.access_token) {
            this.logger.verbose(
                "TokenCache - no access token found in response"
            );
            return null;
        } else if (!response.expires_in) {
            this.logger.error(
                "TokenCache - no expiration set on the access token. Cannot add it to the cache."
            );
            return null;
        } else if (
            !response.scope &&
            (!request.scopes || !request.scopes.length)
        ) {
            this.logger.error(
                "TokenCache - scopes not specified in the request or response. Cannot add token to the cache."
            );
            return null;
        }

        this.logger.verbose("TokenCache - loading access token");

        const scopes = response.scope
            ? ScopeSet.fromString(response.scope)
            : new ScopeSet(request.scopes);
        const expiresOn =
            options.expiresOn || response.expires_in + TimeUtils.nowSeconds();

        const extendedExpiresOn =
            options.extendedExpiresOn ||
            (response.ext_expires_in || response.expires_in) +
                TimeUtils.nowSeconds();

        const accessTokenEntity = CacheHelpers.createAccessTokenEntity(
            homeAccountId,
            environment,
            response.access_token,
            this.config.auth.clientId,
            tenantId,
            scopes.printScopes(),
            expiresOn,
            extendedExpiresOn,
            base64Decode
        );

        await this.storage.setAccessTokenCredential(
            accessTokenEntity,
            correlationId,
            kmsi
        );
        return accessTokenEntity;
    }

    /**
     * Helper function to load refresh tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @returns `RefreshTokenEntity`
     */
    private async loadRefreshToken(
        response: ExternalTokenResponse,
        homeAccountId: string,
        environment: string,
        correlationId: string,
        kmsi: boolean
    ): Promise<RefreshTokenEntity | null> {
        if (!response.refresh_token) {
            this.logger.verbose(
                "TokenCache - no refresh token found in response"
            );
            return null;
        }

        const expiresOn = response.refresh_token_expires_in
            ? response.refresh_token_expires_in + TimeUtils.nowSeconds()
            : undefined;
        this.performanceClient.addFields(
            {
                extRtExpiresOnSeconds: expiresOn,
            },
            correlationId
        );

        this.logger.verbose("TokenCache - loading refresh token");
        const refreshTokenEntity = CacheHelpers.createRefreshTokenEntity(
            homeAccountId,
            environment,
            response.refresh_token,
            this.config.auth.clientId,
            response.foci,
            undefined, // userAssertionHash
            expiresOn
        );

        await this.storage.setRefreshTokenCredential(
            refreshTokenEntity,
            correlationId,
            kmsi
        );
        return refreshTokenEntity;
    }

    /**
     * Helper function to generate an `AuthenticationResult` for the result.
     * @param request
     * @param idTokenObj
     * @param cacheRecord
     * @param authority
     * @returns `AuthenticationResult`
     */
    private generateAuthenticationResult(
        request: SilentRequest,
        cacheRecord: CacheRecord & { account: AccountEntity },
        authority: Authority,
        idTokenClaims?: TokenClaims
    ): AuthenticationResult {
        let accessToken: string = "";
        let responseScopes: Array<string> = [];
        let expiresOn: Date | null = null;
        let extExpiresOn: Date | undefined;

        if (cacheRecord?.accessToken) {
            accessToken = cacheRecord.accessToken.secret;
            responseScopes = ScopeSet.fromString(
                cacheRecord.accessToken.target
            ).asArray();
            // Access token expiresOn stored in seconds, converting to Date for AuthenticationResult
            expiresOn = TimeUtils.toDateFromSeconds(
                cacheRecord.accessToken.expiresOn
            );
            extExpiresOn = TimeUtils.toDateFromSeconds(
                cacheRecord.accessToken.extendedExpiresOn
            );
        }

        const accountEntity = cacheRecord.account;

        return {
            authority: authority ? authority.canonicalAuthority : "",
            uniqueId: cacheRecord.account.localAccountId,
            tenantId: cacheRecord.account.realm,
            scopes: responseScopes,
            account: AccountEntity.getAccountInfo(accountEntity),
            idToken: cacheRecord.idToken?.secret || "",
            idTokenClaims: idTokenClaims || {},
            accessToken: accessToken,
            fromCache: true,
            expiresOn: expiresOn,
            correlationId: request.correlationId || "",
            requestId: "",
            extExpiresOn: extExpiresOn,
            familyId: cacheRecord.refreshToken?.familyId || "",
            tokenType: cacheRecord?.accessToken?.tokenType || "",
            state: request.state || "",
            cloudGraphHostName: accountEntity.cloudGraphHostName || "",
            msGraphHost: accountEntity.msGraphHost || "",
            fromNativeBroker: false,
        };
    }
}
