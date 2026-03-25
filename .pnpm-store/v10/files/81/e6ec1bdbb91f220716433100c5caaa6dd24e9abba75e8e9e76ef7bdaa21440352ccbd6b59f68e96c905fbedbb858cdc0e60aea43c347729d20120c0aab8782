/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { DB_NAME, DB_VERSION, DB_TABLE_NAME } from '../utils/BrowserConstants.mjs';
import { databaseUnavailable, databaseNotOpen } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Storage wrapper for IndexedDB storage in browsers: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
class DatabaseStorage {
    constructor() {
        this.dbName = DB_NAME;
        this.version = DB_VERSION;
        this.tableName = DB_TABLE_NAME;
        this.dbOpen = false;
    }
    /**
     * Opens IndexedDB instance.
     */
    async open() {
        return new Promise((resolve, reject) => {
            const openDB = window.indexedDB.open(this.dbName, this.version);
            openDB.addEventListener("upgradeneeded", (e) => {
                const event = e;
                event.target.result.createObjectStore(this.tableName);
            });
            openDB.addEventListener("success", (e) => {
                const event = e;
                this.db = event.target.result;
                this.dbOpen = true;
                resolve();
            });
            openDB.addEventListener("error", () => reject(createBrowserAuthError(databaseUnavailable)));
        });
    }
    /**
     * Closes the connection to IndexedDB database when all pending transactions
     * complete.
     */
    closeConnection() {
        const db = this.db;
        if (db && this.dbOpen) {
            db.close();
            this.dbOpen = false;
        }
    }
    /**
     * Opens database if it's not already open
     */
    async validateDbIsOpen() {
        if (!this.dbOpen) {
            return this.open();
        }
    }
    /**
     * Retrieves item from IndexedDB instance.
     * @param key
     */
    async getItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGet = objectStore.get(key);
            dbGet.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result);
            });
            dbGet.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Adds item to IndexedDB under given key
     * @param key
     * @param payload
     */
    async setItem(key, payload) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbPut = objectStore.put(payload, key);
            dbPut.addEventListener("success", () => {
                this.closeConnection();
                resolve();
            });
            dbPut.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Removes item from IndexedDB under given key
     * @param key
     */
    async removeItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbDelete = objectStore.delete(key);
            dbDelete.addEventListener("success", () => {
                this.closeConnection();
                resolve();
            });
            dbDelete.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Get all the keys from the storage object as an iterable array of strings.
     */
    async getKeys() {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGetKeys = objectStore.getAllKeys();
            dbGetKeys.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result);
            });
            dbGetKeys.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     *
     * Checks whether there is an object under the search key in the object store
     */
    async containsKey(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbContainsKey = objectStore.count(key);
            dbContainsKey.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result === 1);
            });
            dbContainsKey.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Deletes the MSAL database. The database is deleted rather than cleared to make it possible
     * for client applications to downgrade to a previous MSAL version without worrying about forward compatibility issues
     * with IndexedDB database versions.
     */
    async deleteDatabase() {
        // Check if database being deleted exists
        if (this.db && this.dbOpen) {
            this.closeConnection();
        }
        return new Promise((resolve, reject) => {
            const deleteDbRequest = window.indexedDB.deleteDatabase(DB_NAME);
            const id = setTimeout(() => reject(false), 200); // Reject if events aren't raised within 200ms
            deleteDbRequest.addEventListener("success", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("blocked", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("error", () => {
                clearTimeout(id);
                return reject(false);
            });
        });
    }
}

export { DatabaseStorage };
//# sourceMappingURL=DatabaseStorage.mjs.map
