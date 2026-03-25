/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BrowserAuthError } from '../error/BrowserAuthError.mjs';
import { DatabaseStorage } from './DatabaseStorage.mjs';
import { MemoryStorage } from './MemoryStorage.mjs';
import { databaseUnavailable } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class allows MSAL to store artifacts asynchronously using the DatabaseStorage IndexedDB wrapper,
 * backed up with the more volatile MemoryStorage object for cases in which IndexedDB may be unavailable.
 */
class AsyncMemoryStorage {
    constructor(logger) {
        this.inMemoryCache = new MemoryStorage();
        this.indexedDBCache = new DatabaseStorage();
        this.logger = logger;
    }
    handleDatabaseAccessError(error) {
        if (error instanceof BrowserAuthError &&
            error.errorCode === databaseUnavailable) {
            this.logger.error("Could not access persistent storage. This may be caused by browser privacy features which block persistent storage in third-party contexts.");
        }
        else {
            throw error;
        }
    }
    /**
     * Get the item matching the given key. Tries in-memory cache first, then in the asynchronous
     * storage object if item isn't found in-memory.
     * @param key
     */
    async getItem(key) {
        const item = this.inMemoryCache.getItem(key);
        if (!item) {
            try {
                this.logger.verbose("Queried item not found in in-memory cache, now querying persistent storage.");
                return await this.indexedDBCache.getItem(key);
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return item;
    }
    /**
     * Sets the item in the in-memory cache and then tries to set it in the asynchronous
     * storage object with the given key.
     * @param key
     * @param value
     */
    async setItem(key, value) {
        this.inMemoryCache.setItem(key, value);
        try {
            await this.indexedDBCache.setItem(key, value);
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
        }
    }
    /**
     * Removes the item matching the key from the in-memory cache, then tries to remove it from the asynchronous storage object.
     * @param key
     */
    async removeItem(key) {
        this.inMemoryCache.removeItem(key);
        try {
            await this.indexedDBCache.removeItem(key);
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
        }
    }
    /**
     * Get all the keys from the in-memory cache as an iterable array of strings. If no keys are found, query the keys in the
     * asynchronous storage object.
     */
    async getKeys() {
        const cacheKeys = this.inMemoryCache.getKeys();
        if (cacheKeys.length === 0) {
            try {
                this.logger.verbose("In-memory cache is empty, now querying persistent storage.");
                return await this.indexedDBCache.getKeys();
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return cacheKeys;
    }
    /**
     * Returns true or false if the given key is present in the cache.
     * @param key
     */
    async containsKey(key) {
        const containsKey = this.inMemoryCache.containsKey(key);
        if (!containsKey) {
            try {
                this.logger.verbose("Key not found in in-memory cache, now querying persistent storage.");
                return await this.indexedDBCache.containsKey(key);
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return containsKey;
    }
    /**
     * Clears in-memory Map
     */
    clearInMemory() {
        // InMemory cache is a Map instance, clear is straightforward
        this.logger.verbose(`Deleting in-memory keystore`);
        this.inMemoryCache.clear();
        this.logger.verbose(`In-memory keystore deleted`);
    }
    /**
     * Tries to delete the IndexedDB database
     * @returns
     */
    async clearPersistent() {
        try {
            this.logger.verbose("Deleting persistent keystore");
            const dbDeleted = await this.indexedDBCache.deleteDatabase();
            if (dbDeleted) {
                this.logger.verbose("Persistent keystore deleted");
            }
            return dbDeleted;
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
            return false;
        }
    }
}

export { AsyncMemoryStorage };
//# sourceMappingURL=AsyncMemoryStorage.mjs.map
