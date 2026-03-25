/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { NodeStorage } from './NodeStorage.mjs';
import { TokenCacheContext } from '@azure/msal-common/node';
import { Deserializer } from './serializer/Deserializer.mjs';
import { Serializer } from './serializer/Serializer.mjs';
import { CryptoProvider } from '../crypto/CryptoProvider.mjs';
import { GuidGenerator } from '../crypto/GuidGenerator.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const defaultSerializedCache = {
    Account: {},
    IdToken: {},
    AccessToken: {},
    RefreshToken: {},
    AppMetadata: {},
};
/**
 * In-memory token cache manager
 * @public
 */
class TokenCache {
    constructor(storage, logger, cachePlugin) {
        this.cacheHasChanged = false;
        this.storage = storage;
        this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this));
        if (cachePlugin) {
            this.persistence = cachePlugin;
        }
        this.logger = logger;
    }
    /**
     * Set to true if cache state has changed since last time serialize or writeToPersistence was called
     */
    hasChanged() {
        return this.cacheHasChanged;
    }
    /**
     * Serializes in memory cache to JSON
     */
    serialize() {
        this.logger.trace("Serializing in-memory cache");
        let finalState = Serializer.serializeAllCache(this.storage.getInMemoryCache());
        // if cacheSnapshot not null or empty, merge
        if (this.cacheSnapshot) {
            this.logger.trace("Reading cache snapshot from disk");
            finalState = this.mergeState(JSON.parse(this.cacheSnapshot), finalState);
        }
        else {
            this.logger.trace("No cache snapshot to merge");
        }
        this.cacheHasChanged = false;
        return JSON.stringify(finalState);
    }
    /**
     * Deserializes JSON to in-memory cache. JSON should be in MSAL cache schema format
     * @param cache - blob formatted cache
     */
    deserialize(cache) {
        this.logger.trace("Deserializing JSON to in-memory cache");
        this.cacheSnapshot = cache;
        if (this.cacheSnapshot) {
            this.logger.trace("Reading cache snapshot from disk");
            const deserializedCache = Deserializer.deserializeAllCache(this.overlayDefaults(JSON.parse(this.cacheSnapshot)));
            this.storage.setInMemoryCache(deserializedCache);
        }
        else {
            this.logger.trace("No cache snapshot to deserialize");
        }
    }
    /**
     * Fetches the cache key-value map
     */
    getKVStore() {
        return this.storage.getCache();
    }
    /**
     * Gets cache snapshot in CacheKVStore format
     */
    getCacheSnapshot() {
        const deserializedPersistentStorage = NodeStorage.generateInMemoryCache(this.cacheSnapshot);
        return this.storage.inMemoryCacheToCache(deserializedPersistentStorage);
    }
    /**
     * API that retrieves all accounts currently in cache to the user
     */
    async getAllAccounts(correlationId = new CryptoProvider().createNewGuid()) {
        this.logger.trace("getAllAccounts called");
        let cacheContext;
        try {
            if (this.persistence) {
                cacheContext = new TokenCacheContext(this, false);
                await this.persistence.beforeCacheAccess(cacheContext);
            }
            return this.storage.getAllAccounts({}, correlationId);
        }
        finally {
            if (this.persistence && cacheContext) {
                await this.persistence.afterCacheAccess(cacheContext);
            }
        }
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId - unique identifier for an account (uid.utid)
     */
    async getAccountByHomeId(homeAccountId) {
        const allAccounts = await this.getAllAccounts();
        if (homeAccountId && allAccounts && allAccounts.length) {
            return (allAccounts.filter((accountObj) => accountObj.homeAccountId === homeAccountId)[0] || null);
        }
        else {
            return null;
        }
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId - unique identifier of an account (sub/obj when homeAccountId cannot be populated)
     */
    async getAccountByLocalId(localAccountId) {
        const allAccounts = await this.getAllAccounts();
        if (localAccountId && allAccounts && allAccounts.length) {
            return (allAccounts.filter((accountObj) => accountObj.localAccountId === localAccountId)[0] || null);
        }
        else {
            return null;
        }
    }
    /**
     * API to remove a specific account and the relevant data from cache
     * @param account - AccountInfo passed by the user
     */
    async removeAccount(account, correlationId) {
        this.logger.trace("removeAccount called");
        let cacheContext;
        try {
            if (this.persistence) {
                cacheContext = new TokenCacheContext(this, true);
                await this.persistence.beforeCacheAccess(cacheContext);
            }
            this.storage.removeAccount(account, correlationId || new GuidGenerator().generateGuid());
        }
        finally {
            if (this.persistence && cacheContext) {
                await this.persistence.afterCacheAccess(cacheContext);
            }
        }
    }
    /**
     * Overwrites in-memory cache with persistent cache
     */
    async overwriteCache() {
        if (!this.persistence) {
            this.logger.info("No persistence layer specified, cache cannot be overwritten");
            return;
        }
        this.logger.info("Overwriting in-memory cache with persistent cache");
        this.storage.clear();
        const cacheContext = new TokenCacheContext(this, false);
        await this.persistence.beforeCacheAccess(cacheContext);
        const cacheSnapshot = this.getCacheSnapshot();
        this.storage.setCache(cacheSnapshot);
        await this.persistence.afterCacheAccess(cacheContext);
    }
    /**
     * Called when the cache has changed state.
     */
    handleChangeEvent() {
        this.cacheHasChanged = true;
    }
    /**
     * Merge in memory cache with the cache snapshot.
     * @param oldState - cache before changes
     * @param currentState - current cache state in the library
     */
    mergeState(oldState, currentState) {
        this.logger.trace("Merging in-memory cache with cache snapshot");
        const stateAfterRemoval = this.mergeRemovals(oldState, currentState);
        return this.mergeUpdates(stateAfterRemoval, currentState);
    }
    /**
     * Deep update of oldState based on newState values
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    mergeUpdates(oldState, newState) {
        Object.keys(newState).forEach((newKey) => {
            const newValue = newState[newKey];
            // if oldState does not contain value but newValue does, add it
            if (!oldState.hasOwnProperty(newKey)) {
                if (newValue !== null) {
                    oldState[newKey] = newValue;
                }
            }
            else {
                // both oldState and newState contain the key, do deep update
                const newValueNotNull = newValue !== null;
                const newValueIsObject = typeof newValue === "object";
                const newValueIsNotArray = !Array.isArray(newValue);
                const oldStateNotUndefinedOrNull = typeof oldState[newKey] !== "undefined" &&
                    oldState[newKey] !== null;
                if (newValueNotNull &&
                    newValueIsObject &&
                    newValueIsNotArray &&
                    oldStateNotUndefinedOrNull) {
                    this.mergeUpdates(oldState[newKey], newValue);
                }
                else {
                    oldState[newKey] = newValue;
                }
            }
        });
        return oldState;
    }
    /**
     * Removes entities in oldState that the were removed from newState. If there are any unknown values in root of
     * oldState that are not recognized, they are left untouched.
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    mergeRemovals(oldState, newState) {
        this.logger.trace("Remove updated entries in cache");
        const accounts = oldState.Account
            ? this.mergeRemovalsDict(oldState.Account, newState.Account)
            : oldState.Account;
        const accessTokens = oldState.AccessToken
            ? this.mergeRemovalsDict(oldState.AccessToken, newState.AccessToken)
            : oldState.AccessToken;
        const refreshTokens = oldState.RefreshToken
            ? this.mergeRemovalsDict(oldState.RefreshToken, newState.RefreshToken)
            : oldState.RefreshToken;
        const idTokens = oldState.IdToken
            ? this.mergeRemovalsDict(oldState.IdToken, newState.IdToken)
            : oldState.IdToken;
        const appMetadata = oldState.AppMetadata
            ? this.mergeRemovalsDict(oldState.AppMetadata, newState.AppMetadata)
            : oldState.AppMetadata;
        return {
            ...oldState,
            Account: accounts,
            AccessToken: accessTokens,
            RefreshToken: refreshTokens,
            IdToken: idTokens,
            AppMetadata: appMetadata,
        };
    }
    /**
     * Helper to merge new cache with the old one
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    mergeRemovalsDict(oldState, newState) {
        const finalState = { ...oldState };
        Object.keys(oldState).forEach((oldKey) => {
            if (!newState || !newState.hasOwnProperty(oldKey)) {
                delete finalState[oldKey];
            }
        });
        return finalState;
    }
    /**
     * Helper to overlay as a part of cache merge
     * @param passedInCache - cache read from the blob
     */
    overlayDefaults(passedInCache) {
        this.logger.trace("Overlaying input cache with the default cache");
        return {
            Account: {
                ...defaultSerializedCache.Account,
                ...passedInCache.Account,
            },
            IdToken: {
                ...defaultSerializedCache.IdToken,
                ...passedInCache.IdToken,
            },
            AccessToken: {
                ...defaultSerializedCache.AccessToken,
                ...passedInCache.AccessToken,
            },
            RefreshToken: {
                ...defaultSerializedCache.RefreshToken,
                ...passedInCache.RefreshToken,
            },
            AppMetadata: {
                ...defaultSerializedCache.AppMetadata,
                ...passedInCache.AppMetadata,
            },
        };
    }
}

export { TokenCache };
//# sourceMappingURL=TokenCache.mjs.map
