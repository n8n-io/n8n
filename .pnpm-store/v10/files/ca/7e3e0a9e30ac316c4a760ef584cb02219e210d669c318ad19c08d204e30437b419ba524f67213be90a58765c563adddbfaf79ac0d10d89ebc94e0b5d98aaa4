/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AccountFilter } from "../utils/CacheTypes.js";
import { CacheRecord } from "../entities/CacheRecord.js";
import { AccountEntity } from "../entities/AccountEntity.js";
import { AccountInfo } from "../../account/AccountInfo.js";
import { AppMetadataEntity } from "../entities/AppMetadataEntity.js";
import { ServerTelemetryEntity } from "../entities/ServerTelemetryEntity.js";
import { ThrottlingEntity } from "../entities/ThrottlingEntity.js";
import { IdTokenEntity } from "../entities/IdTokenEntity.js";
import { AccessTokenEntity } from "../entities/AccessTokenEntity.js";
import { RefreshTokenEntity } from "../entities/RefreshTokenEntity.js";
import { AuthorityMetadataEntity } from "../entities/AuthorityMetadataEntity.js";
import { StoreInCache } from "../../request/StoreInCache.js";

export interface ICacheManager {
    /**
     * fetch the account entity from the platform cache
     * @param accountKey
     */
    getAccount(accountKey: string, correlationId: string): AccountEntity | null;

    /**
     * set account entity in the platform cache
     * @param account
     * @param correlationId
     * @param kmsi
     * @param apiId - API identifier for telemetry tracking
     */
    setAccount(
        account: AccountEntity,
        correlationId: string,
        kmsi: boolean,
        apiId: number
    ): Promise<void>;

    /**
     * fetch the idToken entity from the platform cache
     * @param idTokenKey
     */
    getIdTokenCredential(
        idTokenKey: string,
        correlationId: string
    ): IdTokenEntity | null;

    /**
     * set idToken entity to the platform cache
     * @param idToken
     * @param correlationId
     * @param kmsi
     */
    setIdTokenCredential(
        idToken: IdTokenEntity,
        correlationId: string,
        kmsi: boolean
    ): Promise<void>;

    /**
     * fetch the idToken entity from the platform cache
     * @param accessTokenKey
     */
    getAccessTokenCredential(
        accessTokenKey: string,
        correlationId: string
    ): AccessTokenEntity | null;

    /**
     * set idToken entity to the platform cache
     * @param accessToken
     * @param correlationId
     * @param kmsi
     */
    setAccessTokenCredential(
        accessToken: AccessTokenEntity,
        correlationId: string,
        kmsi: boolean
    ): Promise<void>;

    /**
     * fetch the idToken entity from the platform cache
     * @param refreshTokenKey
     */
    getRefreshTokenCredential(
        refreshTokenKey: string,
        correlationId: string
    ): RefreshTokenEntity | null;

    /**
     * set idToken entity to the platform cache
     * @param refreshToken
     * @param correlationId
     * @param kmsi
     */
    setRefreshTokenCredential(
        refreshToken: RefreshTokenEntity,
        correlationId: string,
        kmsi: boolean
    ): Promise<void>;

    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;

    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    setAppMetadata(appMetadata: AppMetadataEntity, correlationId: string): void;

    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    getServerTelemetry(
        serverTelemetryKey: string
    ): ServerTelemetryEntity | null;

    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    setServerTelemetry(
        serverTelemetryKey: string,
        serverTelemetry: ServerTelemetryEntity,
        correlationId: string
    ): void;

    /**
     * fetch cloud discovery metadata entity from the platform cache
     * @param key
     */
    getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;

    /**
     * Get cache keys for authority metadata
     */
    getAuthorityMetadataKeys(): Array<string>;

    /**
     * set cloud discovery metadata entity to the platform cache
     * @param key
     * @param value
     */
    setAuthorityMetadata(key: string, value: AuthorityMetadataEntity): void;

    /**
     * Provide an alias to find a matching AuthorityMetadataEntity in cache
     * @param host
     */
    getAuthorityMetadataByAlias(host: string): AuthorityMetadataEntity | null;

    /**
     * given an authority generates the cache key for authorityMetadata
     * @param authority
     */
    generateAuthorityMetadataCacheKey(authority: string): string;

    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;

    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    setThrottlingCache(
        throttlingCacheKey: string,
        throttlingCache: ThrottlingEntity,
        correlationId: string
    ): void;

    /**
     * Returns all accounts in cache
     */
    getAllAccounts(
        accountFilter: AccountFilter,
        correlationId: string
    ): AccountInfo[];

    /**
     * saves a cache record
     * @param cacheRecord
     * @param correlationId
     * @param kmsi
     * @param storeInCache
     */
    saveCacheRecord(
        cacheRecord: CacheRecord,
        correlationId: string,
        kmsi: boolean,
        apiId: number,
        storeInCache?: StoreInCache
    ): Promise<void>;

    /**
     * retrieve accounts matching all provided filters; if no filter is set, get all accounts
     * @param homeAccountId
     * @param environment
     * @param realm
     */
    getAccountsFilteredBy(
        filter: AccountFilter,
        correlationId: string
    ): AccountEntity[];

    /**
     * Get AccountInfo object based on provided filters
     * @param filter
     */
    getAccountInfoFilteredBy(
        filter: AccountFilter,
        correlationId: string
    ): AccountInfo | null;

    /**
     * Removes all accounts and related tokens from cache.
     */
    removeAllAccounts(correlationId: string): void;

    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccount(account: AccountInfo, correlationId: string): void;

    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccountContext(account: AccountInfo, correlationId: string): void;

    /**
     * @param key
     */
    removeIdToken(key: string, correlationId: string): void;

    /**
     * @param key
     */
    removeAccessToken(key: string, correlationId: string): void;

    /**
     * @param key
     */
    removeRefreshToken(key: string, correlationId: string): void;
}
