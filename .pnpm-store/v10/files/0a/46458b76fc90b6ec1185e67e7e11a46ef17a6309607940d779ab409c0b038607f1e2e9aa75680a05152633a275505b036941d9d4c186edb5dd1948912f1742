/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccountCache,
    IdTokenCache,
    AccessTokenCache,
    RefreshTokenCache,
    AppMetadataCache,
    AccountEntity,
    IdTokenEntity,
    AccessTokenEntity,
    RefreshTokenEntity,
    CacheManager,
    CredentialType,
    AuthenticationScheme,
} from "@azure/msal-common/node";
import {
    JsonCache,
    InMemoryCache,
    SerializedAccountEntity,
    SerializedIdTokenEntity,
    SerializedAccessTokenEntity,
    SerializedRefreshTokenEntity,
    SerializedAppMetadataEntity,
} from "./SerializerTypes.js";

/**
 * This class deserializes cache entities read from the file into in-memory object types defined internally
 * @internal
 */
export class Deserializer {
    /**
     * Parse the JSON blob in memory and deserialize the content
     * @param cachedJson - JSON blob cache
     */
    static deserializeJSONBlob(jsonFile: string): JsonCache {
        const deserializedCache = !jsonFile ? {} : JSON.parse(jsonFile);
        return deserializedCache;
    }

    /**
     * Deserializes accounts to AccountEntity objects
     * @param accounts - accounts of type SerializedAccountEntity
     */
    static deserializeAccounts(
        accounts: Record<string, SerializedAccountEntity>
    ): AccountCache {
        const accountObjects: AccountCache = {};
        if (accounts) {
            Object.keys(accounts).map(function (key) {
                const serializedAcc = accounts[key];
                const mappedAcc = {
                    homeAccountId: serializedAcc.home_account_id,
                    environment: serializedAcc.environment,
                    realm: serializedAcc.realm,
                    localAccountId: serializedAcc.local_account_id,
                    username: serializedAcc.username,
                    authorityType: serializedAcc.authority_type,
                    name: serializedAcc.name,
                    clientInfo: serializedAcc.client_info,
                    lastModificationTime: serializedAcc.last_modification_time,
                    lastModificationApp: serializedAcc.last_modification_app,
                    tenantProfiles: serializedAcc.tenantProfiles?.map(
                        (serializedTenantProfile) => {
                            return JSON.parse(serializedTenantProfile);
                        }
                    ),
                    lastUpdatedAt: Date.now().toString(),
                };
                const account: AccountEntity = new AccountEntity();
                CacheManager.toObject(account, mappedAcc);
                accountObjects[key] = account;
            });
        }

        return accountObjects;
    }

    /**
     * Deserializes id tokens to IdTokenEntity objects
     * @param idTokens - credentials of type SerializedIdTokenEntity
     */
    static deserializeIdTokens(
        idTokens: Record<string, SerializedIdTokenEntity>
    ): IdTokenCache {
        const idObjects: IdTokenCache = {};
        if (idTokens) {
            Object.keys(idTokens).map(function (key) {
                const serializedIdT = idTokens[key];
                const idToken: IdTokenEntity = {
                    homeAccountId: serializedIdT.home_account_id,
                    environment: serializedIdT.environment,
                    credentialType:
                        serializedIdT.credential_type as CredentialType,
                    clientId: serializedIdT.client_id,
                    secret: serializedIdT.secret,
                    realm: serializedIdT.realm,
                    lastUpdatedAt: Date.now().toString(),
                };
                idObjects[key] = idToken;
            });
        }
        return idObjects;
    }

    /**
     * Deserializes access tokens to AccessTokenEntity objects
     * @param accessTokens - access tokens of type SerializedAccessTokenEntity
     */
    static deserializeAccessTokens(
        accessTokens: Record<string, SerializedAccessTokenEntity>
    ): AccessTokenCache {
        const atObjects: AccessTokenCache = {};
        if (accessTokens) {
            Object.keys(accessTokens).map(function (key) {
                const serializedAT = accessTokens[key];
                const accessToken: AccessTokenEntity = {
                    homeAccountId: serializedAT.home_account_id,
                    environment: serializedAT.environment,
                    credentialType:
                        serializedAT.credential_type as CredentialType,
                    clientId: serializedAT.client_id,
                    secret: serializedAT.secret,
                    realm: serializedAT.realm,
                    target: serializedAT.target,
                    cachedAt: serializedAT.cached_at,
                    expiresOn: serializedAT.expires_on,
                    extendedExpiresOn: serializedAT.extended_expires_on,
                    refreshOn: serializedAT.refresh_on,
                    keyId: serializedAT.key_id,
                    tokenType: serializedAT.token_type as AuthenticationScheme,
                    requestedClaims: serializedAT.requestedClaims,
                    requestedClaimsHash: serializedAT.requestedClaimsHash,
                    userAssertionHash: serializedAT.userAssertionHash,
                    lastUpdatedAt: Date.now().toString(),
                };
                atObjects[key] = accessToken;
            });
        }

        return atObjects;
    }

    /**
     * Deserializes refresh tokens to RefreshTokenEntity objects
     * @param refreshTokens - refresh tokens of type SerializedRefreshTokenEntity
     */
    static deserializeRefreshTokens(
        refreshTokens: Record<string, SerializedRefreshTokenEntity>
    ): RefreshTokenCache {
        const rtObjects: RefreshTokenCache = {};
        if (refreshTokens) {
            Object.keys(refreshTokens).map(function (key) {
                const serializedRT = refreshTokens[key];
                const refreshToken: RefreshTokenEntity = {
                    homeAccountId: serializedRT.home_account_id,
                    environment: serializedRT.environment,
                    credentialType:
                        serializedRT.credential_type as CredentialType,
                    clientId: serializedRT.client_id,
                    secret: serializedRT.secret,
                    familyId: serializedRT.family_id,
                    target: serializedRT.target,
                    realm: serializedRT.realm,
                    lastUpdatedAt: Date.now().toString(),
                };
                rtObjects[key] = refreshToken;
            });
        }

        return rtObjects;
    }

    /**
     * Deserializes appMetadata to AppMetaData objects
     * @param appMetadata - app metadata of type SerializedAppMetadataEntity
     */
    static deserializeAppMetadata(
        appMetadata: Record<string, SerializedAppMetadataEntity>
    ): AppMetadataCache {
        const appMetadataObjects: AppMetadataCache = {};
        if (appMetadata) {
            Object.keys(appMetadata).map(function (key) {
                const serializedAmdt = appMetadata[key];
                appMetadataObjects[key] = {
                    clientId: serializedAmdt.client_id,
                    environment: serializedAmdt.environment,
                    familyId: serializedAmdt.family_id,
                };
            });
        }

        return appMetadataObjects;
    }

    /**
     * Deserialize an inMemory Cache
     * @param jsonCache - JSON blob cache
     */
    static deserializeAllCache(jsonCache: JsonCache): InMemoryCache {
        return {
            accounts: jsonCache.Account
                ? this.deserializeAccounts(jsonCache.Account)
                : {},
            idTokens: jsonCache.IdToken
                ? this.deserializeIdTokens(jsonCache.IdToken)
                : {},
            accessTokens: jsonCache.AccessToken
                ? this.deserializeAccessTokens(jsonCache.AccessToken)
                : {},
            refreshTokens: jsonCache.RefreshToken
                ? this.deserializeRefreshTokens(jsonCache.RefreshToken)
                : {},
            appMetadata: jsonCache.AppMetadata
                ? this.deserializeAppMetadata(jsonCache.AppMetadata)
                : {},
        };
    }
}
