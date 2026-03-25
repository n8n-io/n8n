/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { CacheManager, AccountEntity, CacheHelpers } from '@azure/msal-common/node';
import { Deserializer } from './serializer/Deserializer.mjs';
import { Serializer } from './serializer/Serializer.mjs';
import { StubPerformanceClient } from '@azure/msal-common';
import { generateCredentialKey, generateAccountKey } from './CacheHelpers.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements Storage for node, reading cache from user specified storage location or an  extension library
 * @public
 */
class NodeStorage extends CacheManager {
    constructor(logger, clientId, cryptoImpl, staticAuthorityOptions) {
        super(clientId, cryptoImpl, logger, new StubPerformanceClient(), staticAuthorityOptions);
        this.cache = {};
        this.changeEmitters = [];
        this.logger = logger;
    }
    /**
     * Queue up callbacks
     * @param func - a callback function for cache change indication
     */
    registerChangeEmitter(func) {
        this.changeEmitters.push(func);
    }
    /**
     * Invoke the callback when cache changes
     */
    emitChange() {
        this.changeEmitters.forEach((func) => func.call(null));
    }
    /**
     * Converts cacheKVStore to InMemoryCache
     * @param cache - key value store
     */
    cacheToInMemoryCache(cache) {
        const inMemoryCache = {
            accounts: {},
            idTokens: {},
            accessTokens: {},
            refreshTokens: {},
            appMetadata: {},
        };
        for (const key in cache) {
            const value = cache[key];
            if (typeof value !== "object") {
                continue;
            }
            if (value instanceof AccountEntity) {
                inMemoryCache.accounts[key] = value;
            }
            else if (CacheHelpers.isIdTokenEntity(value)) {
                inMemoryCache.idTokens[key] = value;
            }
            else if (CacheHelpers.isAccessTokenEntity(value)) {
                inMemoryCache.accessTokens[key] = value;
            }
            else if (CacheHelpers.isRefreshTokenEntity(value)) {
                inMemoryCache.refreshTokens[key] = value;
            }
            else if (CacheHelpers.isAppMetadataEntity(key, value)) {
                inMemoryCache.appMetadata[key] = value;
            }
            else {
                continue;
            }
        }
        return inMemoryCache;
    }
    /**
     * converts inMemoryCache to CacheKVStore
     * @param inMemoryCache - kvstore map for inmemory
     */
    inMemoryCacheToCache(inMemoryCache) {
        // convert in memory cache to a flat Key-Value map
        let cache = this.getCache();
        cache = {
            ...cache,
            ...inMemoryCache.accounts,
            ...inMemoryCache.idTokens,
            ...inMemoryCache.accessTokens,
            ...inMemoryCache.refreshTokens,
            ...inMemoryCache.appMetadata,
        };
        // convert in memory cache to a flat Key-Value map
        return cache;
    }
    /**
     * gets the current in memory cache for the client
     */
    getInMemoryCache() {
        this.logger.trace("Getting in-memory cache");
        // convert the cache key value store to inMemoryCache
        const inMemoryCache = this.cacheToInMemoryCache(this.getCache());
        return inMemoryCache;
    }
    /**
     * sets the current in memory cache for the client
     * @param inMemoryCache - key value map in memory
     */
    setInMemoryCache(inMemoryCache) {
        this.logger.trace("Setting in-memory cache");
        // convert and append the inMemoryCache to cacheKVStore
        const cache = this.inMemoryCacheToCache(inMemoryCache);
        this.setCache(cache);
        this.emitChange();
    }
    /**
     * get the current cache key-value store
     */
    getCache() {
        this.logger.trace("Getting cache key-value store");
        return this.cache;
    }
    /**
     * sets the current cache (key value store)
     * @param cacheMap - key value map
     */
    setCache(cache) {
        this.logger.trace("Setting cache key value store");
        this.cache = cache;
        // mark change in cache
        this.emitChange();
    }
    /**
     * Gets cache item with given key.
     * @param key - lookup key for the cache entry
     */
    getItem(key) {
        this.logger.tracePii(`Item key: ${key}`);
        // read cache
        const cache = this.getCache();
        return cache[key];
    }
    /**
     * Gets cache item with given key-value
     * @param key - lookup key for the cache entry
     * @param value - value of the cache entry
     */
    setItem(key, value) {
        this.logger.tracePii(`Item key: ${key}`);
        // read cache
        const cache = this.getCache();
        cache[key] = value;
        // write to cache
        this.setCache(cache);
    }
    generateCredentialKey(credential) {
        return generateCredentialKey(credential);
    }
    generateAccountKey(account) {
        return generateAccountKey(account);
    }
    getAccountKeys() {
        const inMemoryCache = this.getInMemoryCache();
        const accountKeys = Object.keys(inMemoryCache.accounts);
        return accountKeys;
    }
    getTokenKeys() {
        const inMemoryCache = this.getInMemoryCache();
        const tokenKeys = {
            idToken: Object.keys(inMemoryCache.idTokens),
            accessToken: Object.keys(inMemoryCache.accessTokens),
            refreshToken: Object.keys(inMemoryCache.refreshTokens),
        };
        return tokenKeys;
    }
    /**
     * Reads account from cache, builds it into an account entity and returns it.
     * @param accountKey - lookup key to fetch cache type AccountEntity
     * @returns
     */
    getAccount(accountKey) {
        const cachedAccount = this.getItem(accountKey);
        return cachedAccount
            ? Object.assign(new AccountEntity(), this.getItem(accountKey))
            : null;
    }
    /**
     * set account entity
     * @param account - cache value to be set of type AccountEntity
     */
    async setAccount(account) {
        const accountKey = this.generateAccountKey(AccountEntity.getAccountInfo(account));
        this.setItem(accountKey, account);
    }
    /**
     * fetch the idToken credential
     * @param idTokenKey - lookup key to fetch cache type IdTokenEntity
     */
    getIdTokenCredential(idTokenKey) {
        const idToken = this.getItem(idTokenKey);
        if (CacheHelpers.isIdTokenEntity(idToken)) {
            return idToken;
        }
        return null;
    }
    /**
     * set idToken credential
     * @param idToken - cache value to be set of type IdTokenEntity
     */
    async setIdTokenCredential(idToken) {
        const idTokenKey = this.generateCredentialKey(idToken);
        this.setItem(idTokenKey, idToken);
    }
    /**
     * fetch the accessToken credential
     * @param accessTokenKey - lookup key to fetch cache type AccessTokenEntity
     */
    getAccessTokenCredential(accessTokenKey) {
        const accessToken = this.getItem(accessTokenKey);
        if (CacheHelpers.isAccessTokenEntity(accessToken)) {
            return accessToken;
        }
        return null;
    }
    /**
     * set accessToken credential
     * @param accessToken -  cache value to be set of type AccessTokenEntity
     */
    async setAccessTokenCredential(accessToken) {
        const accessTokenKey = this.generateCredentialKey(accessToken);
        this.setItem(accessTokenKey, accessToken);
    }
    /**
     * fetch the refreshToken credential
     * @param refreshTokenKey - lookup key to fetch cache type RefreshTokenEntity
     */
    getRefreshTokenCredential(refreshTokenKey) {
        const refreshToken = this.getItem(refreshTokenKey);
        if (CacheHelpers.isRefreshTokenEntity(refreshToken)) {
            return refreshToken;
        }
        return null;
    }
    /**
     * set refreshToken credential
     * @param refreshToken - cache value to be set of type RefreshTokenEntity
     */
    async setRefreshTokenCredential(refreshToken) {
        const refreshTokenKey = this.generateCredentialKey(refreshToken);
        this.setItem(refreshTokenKey, refreshToken);
    }
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey - lookup key to fetch cache type AppMetadataEntity
     */
    getAppMetadata(appMetadataKey) {
        const appMetadata = this.getItem(appMetadataKey);
        if (CacheHelpers.isAppMetadataEntity(appMetadataKey, appMetadata)) {
            return appMetadata;
        }
        return null;
    }
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata - cache value to be set of type AppMetadataEntity
     */
    setAppMetadata(appMetadata) {
        const appMetadataKey = CacheHelpers.generateAppMetadataKey(appMetadata);
        this.setItem(appMetadataKey, appMetadata);
    }
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetrykey - lookup key to fetch cache type ServerTelemetryEntity
     */
    getServerTelemetry(serverTelemetrykey) {
        const serverTelemetryEntity = this.getItem(serverTelemetrykey);
        if (serverTelemetryEntity &&
            CacheHelpers.isServerTelemetryEntity(serverTelemetrykey, serverTelemetryEntity)) {
            return serverTelemetryEntity;
        }
        return null;
    }
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey - lookup key to fetch cache type ServerTelemetryEntity
     * @param serverTelemetry - cache value to be set of type ServerTelemetryEntity
     */
    setServerTelemetry(serverTelemetryKey, serverTelemetry) {
        this.setItem(serverTelemetryKey, serverTelemetry);
    }
    /**
     * fetch authority metadata entity from the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     */
    getAuthorityMetadata(key) {
        const authorityMetadataEntity = this.getItem(key);
        if (authorityMetadataEntity &&
            CacheHelpers.isAuthorityMetadataEntity(key, authorityMetadataEntity)) {
            return authorityMetadataEntity;
        }
        return null;
    }
    /**
     * Get all authority metadata keys
     */
    getAuthorityMetadataKeys() {
        return this.getKeys().filter((key) => {
            return this.isAuthorityMetadata(key);
        });
    }
    /**
     * set authority metadata entity to the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     * @param metadata - cache value to be set of type AuthorityMetadataEntity
     */
    setAuthorityMetadata(key, metadata) {
        this.setItem(key, metadata);
    }
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     */
    getThrottlingCache(throttlingCacheKey) {
        const throttlingCache = this.getItem(throttlingCacheKey);
        if (throttlingCache &&
            CacheHelpers.isThrottlingEntity(throttlingCacheKey, throttlingCache)) {
            return throttlingCache;
        }
        return null;
    }
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     * @param throttlingCache - cache value to be set of type ThrottlingEntity
     */
    setThrottlingCache(throttlingCacheKey, throttlingCache) {
        this.setItem(throttlingCacheKey, throttlingCache);
    }
    /**
     * Removes the cache item from memory with the given key.
     * @param key - lookup key to remove a cache entity
     * @param inMemory - key value map of the cache
     */
    removeItem(key) {
        this.logger.tracePii(`Item key: ${key}`);
        // read inMemoryCache
        let result = false;
        const cache = this.getCache();
        if (!!cache[key]) {
            delete cache[key];
            result = true;
        }
        // write to the cache after removal
        if (result) {
            this.setCache(cache);
            this.emitChange();
        }
        return result;
    }
    /**
     * Remove account entity from the platform cache if it's outdated
     * @param accountKey - lookup key to fetch cache type AccountEntity
     */
    removeOutdatedAccount(accountKey) {
        this.removeItem(accountKey);
    }
    /**
     * Checks whether key is in cache.
     * @param key - look up key for a cache entity
     */
    containsKey(key) {
        return this.getKeys().includes(key);
    }
    /**
     * Gets all keys in window.
     */
    getKeys() {
        this.logger.trace("Retrieving all cache keys");
        // read cache
        const cache = this.getCache();
        return [...Object.keys(cache)];
    }
    /**
     * Clears all cache entries created by MSAL (except tokens).
     */
    clear() {
        this.logger.trace("Clearing cache entries created by MSAL");
        // read inMemoryCache
        const cacheKeys = this.getKeys();
        // delete each element
        cacheKeys.forEach((key) => {
            this.removeItem(key);
        });
        this.emitChange();
    }
    /**
     * Initialize in memory cache from an exisiting cache vault
     * @param cache - blob formatted cache (JSON)
     */
    static generateInMemoryCache(cache) {
        return Deserializer.deserializeAllCache(Deserializer.deserializeJSONBlob(cache));
    }
    /**
     * retrieves the final JSON
     * @param inMemoryCache - itemised cache read from the JSON
     */
    static generateJsonCache(inMemoryCache) {
        return Serializer.serializeAllCache(inMemoryCache);
    }
    /**
     * Updates a credential's cache key if the current cache key is outdated
     */
    updateCredentialCacheKey(currentCacheKey, credential) {
        const updatedCacheKey = this.generateCredentialKey(credential);
        if (currentCacheKey !== updatedCacheKey) {
            const cacheItem = this.getItem(currentCacheKey);
            if (cacheItem) {
                this.removeItem(currentCacheKey);
                this.setItem(updatedCacheKey, cacheItem);
                this.logger.verbose(`Updated an outdated ${credential.credentialType} cache key`);
                return updatedCacheKey;
            }
            else {
                this.logger.error(`Attempted to update an outdated ${credential.credentialType} cache key but no item matching the outdated key was found in storage`);
            }
        }
        return currentCacheKey;
    }
}

export { NodeStorage };
//# sourceMappingURL=NodeStorage.mjs.map
