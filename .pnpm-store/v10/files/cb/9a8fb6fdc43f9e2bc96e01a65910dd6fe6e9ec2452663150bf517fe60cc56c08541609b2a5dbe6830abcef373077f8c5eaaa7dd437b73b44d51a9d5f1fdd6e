/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    TokenKeys,
    IPerformanceClient,
    invokeAsync,
    PerformanceEvents,
    Logger,
    invoke,
} from "@azure/msal-common/browser";
import {
    createNewGuid,
    decrypt,
    encrypt,
    generateBaseKey,
    generateHKDF,
} from "../crypto/BrowserCrypto.js";
import { base64DecToArr } from "../encode/Base64Decode.js";
import { urlEncodeArr } from "../encode/Base64Encode.js";
import {
    BrowserAuthErrorCodes,
    createBrowserAuthError,
} from "../error/BrowserAuthError.js";
import {
    BrowserConfigurationAuthErrorCodes,
    createBrowserConfigurationAuthError,
} from "../error/BrowserConfigurationAuthError.js";
import { CookieStorage, SameSiteOptions } from "./CookieStorage.js";
import { IWindowStorage } from "./IWindowStorage.js";
import { MemoryStorage } from "./MemoryStorage.js";
import { getAccountKeys, getTokenKeys } from "./CacheHelpers.js";
import * as CacheKeys from "./CacheKeys.js";
import { EncryptedData, isEncrypted } from "./EncryptedData.js";

const ENCRYPTION_KEY = "msal.cache.encryption";
const BROADCAST_CHANNEL_NAME = "msal.broadcast.cache";

type EncryptionCookie = {
    id: string;
    key: CryptoKey;
};

export class LocalStorage implements IWindowStorage<string> {
    private clientId: string;
    private initialized: boolean;
    private memoryStorage: MemoryStorage<string>;
    private performanceClient: IPerformanceClient;
    private logger: Logger;
    private encryptionCookie?: EncryptionCookie;
    private broadcast: BroadcastChannel;

    constructor(
        clientId: string,
        logger: Logger,
        performanceClient: IPerformanceClient
    ) {
        if (!window.localStorage) {
            throw createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.storageNotSupported
            );
        }
        this.memoryStorage = new MemoryStorage<string>();
        this.initialized = false;
        this.clientId = clientId;
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.broadcast = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }

    async initialize(correlationId: string): Promise<void> {
        const cookies = new CookieStorage();
        const cookieString = cookies.getItem(ENCRYPTION_KEY);
        let parsedCookie = { key: "", id: "" };
        if (cookieString) {
            try {
                parsedCookie = JSON.parse(cookieString);
            } catch (e) {}
        }
        if (parsedCookie.key && parsedCookie.id) {
            // Encryption key already exists, import
            const baseKey = invoke(
                base64DecToArr,
                PerformanceEvents.Base64Decode,
                this.logger,
                this.performanceClient,
                correlationId
            )(parsedCookie.key);
            this.encryptionCookie = {
                id: parsedCookie.id,
                key: await invokeAsync(
                    generateHKDF,
                    PerformanceEvents.GenerateHKDF,
                    this.logger,
                    this.performanceClient,
                    correlationId
                )(baseKey),
            };
        } else {
            // Encryption key doesn't exist or is invalid, generate a new one
            const id = createNewGuid();
            const baseKey = await invokeAsync(
                generateBaseKey,
                PerformanceEvents.GenerateBaseKey,
                this.logger,
                this.performanceClient,
                correlationId
            )();
            const keyStr = invoke(
                urlEncodeArr,
                PerformanceEvents.UrlEncodeArr,
                this.logger,
                this.performanceClient,
                correlationId
            )(new Uint8Array(baseKey));
            this.encryptionCookie = {
                id: id,
                key: await invokeAsync(
                    generateHKDF,
                    PerformanceEvents.GenerateHKDF,
                    this.logger,
                    this.performanceClient,
                    correlationId
                )(baseKey),
            };

            const cookieData = {
                id: id,
                key: keyStr,
            };

            cookies.setItem(
                ENCRYPTION_KEY,
                JSON.stringify(cookieData),
                0, // Expiration - 0 means cookie will be cleared at the end of the browser session
                true, // Secure flag
                SameSiteOptions.None // SameSite must be None to support iframed apps
            );
        }

        await invokeAsync(
            this.importExistingCache.bind(this),
            PerformanceEvents.ImportExistingCache,
            this.logger,
            this.performanceClient,
            correlationId
        )(correlationId);

        // Register listener for cache updates in other tabs
        this.broadcast.addEventListener("message", this.updateCache.bind(this));

        this.initialized = true;
    }

    getItem(key: string): string | null {
        return window.localStorage.getItem(key);
    }

    getUserData(key: string): string | null {
        if (!this.initialized) {
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.uninitializedPublicClientApplication
            );
        }
        return this.memoryStorage.getItem(key);
    }

    async decryptData(
        key: string,
        data: EncryptedData,
        correlationId: string
    ): Promise<object | null> {
        if (!this.initialized || !this.encryptionCookie) {
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.uninitializedPublicClientApplication
            );
        }

        if (data.id !== this.encryptionCookie.id) {
            // Data was encrypted with a different key. It must be removed because it is from a previous session.
            this.performanceClient.incrementFields(
                { encryptedCacheExpiredCount: 1 },
                correlationId
            );
            return null;
        }

        const decryptedData = await invokeAsync(
            decrypt,
            PerformanceEvents.Decrypt,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            this.encryptionCookie.key,
            data.nonce,
            this.getContext(key),
            data.data
        );

        if (!decryptedData) {
            return null;
        }

        try {
            return {
                ...JSON.parse(decryptedData),
                lastUpdatedAt: data.lastUpdatedAt,
            };
        } catch (e) {
            this.performanceClient.incrementFields(
                { encryptedCacheCorruptionCount: 1 },
                correlationId
            );
            return null;
        }
    }

    setItem(key: string, value: string): void {
        window.localStorage.setItem(key, value);
    }

    async setUserData(
        key: string,
        value: string,
        correlationId: string,
        timestamp: string,
        kmsi: boolean
    ): Promise<void> {
        if (!this.initialized || !this.encryptionCookie) {
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.uninitializedPublicClientApplication
            );
        }

        if (kmsi) {
            this.setItem(key, value);
        } else {
            const { data, nonce } = await invokeAsync(
                encrypt,
                PerformanceEvents.Encrypt,
                this.logger,
                this.performanceClient,
                correlationId
            )(this.encryptionCookie.key, value, this.getContext(key));
            const encryptedData: EncryptedData = {
                id: this.encryptionCookie.id,
                nonce: nonce,
                data: data,
                lastUpdatedAt: timestamp,
            };
            this.setItem(key, JSON.stringify(encryptedData));
        }

        this.memoryStorage.setItem(key, value);

        // Notify other frames to update their in-memory cache
        this.broadcast.postMessage({
            key: key,
            value: value,
            context: this.getContext(key),
        });
    }

    removeItem(key: string): void {
        if (this.memoryStorage.containsKey(key)) {
            this.memoryStorage.removeItem(key);
            this.broadcast.postMessage({
                key: key,
                value: null,
                context: this.getContext(key),
            });
        }
        window.localStorage.removeItem(key);
    }

    getKeys(): string[] {
        return Object.keys(window.localStorage);
    }

    containsKey(key: string): boolean {
        return window.localStorage.hasOwnProperty(key);
    }

    /**
     * Removes all known MSAL keys from the cache
     */
    clear(): void {
        // Removes all remaining MSAL cache items
        this.memoryStorage.clear();

        const accountKeys = getAccountKeys(this);
        accountKeys.forEach((key) => this.removeItem(key));
        const tokenKeys = getTokenKeys(this.clientId, this);
        tokenKeys.idToken.forEach((key) => this.removeItem(key));
        tokenKeys.accessToken.forEach((key) => this.removeItem(key));
        tokenKeys.refreshToken.forEach((key) => this.removeItem(key));

        // Clean up anything left
        this.getKeys().forEach((cacheKey: string) => {
            if (
                cacheKey.startsWith(CacheKeys.PREFIX) ||
                cacheKey.indexOf(this.clientId) !== -1
            ) {
                this.removeItem(cacheKey);
            }
        });
    }

    /**
     * Helper to decrypt all known MSAL keys in localStorage and save them to inMemory storage
     * @returns
     */
    private async importExistingCache(correlationId: string): Promise<void> {
        if (!this.encryptionCookie) {
            return;
        }

        let accountKeys = getAccountKeys(this);
        accountKeys = await this.importArray(accountKeys, correlationId);
        // Write valid account keys back to map
        if (accountKeys.length) {
            this.setItem(
                CacheKeys.getAccountKeysCacheKey(),
                JSON.stringify(accountKeys)
            );
        } else {
            this.removeItem(CacheKeys.getAccountKeysCacheKey());
        }

        const tokenKeys: TokenKeys = getTokenKeys(this.clientId, this);
        tokenKeys.idToken = await this.importArray(
            tokenKeys.idToken,
            correlationId
        );
        tokenKeys.accessToken = await this.importArray(
            tokenKeys.accessToken,
            correlationId
        );
        tokenKeys.refreshToken = await this.importArray(
            tokenKeys.refreshToken,
            correlationId
        );
        // Write valid token keys back to map
        if (
            tokenKeys.idToken.length ||
            tokenKeys.accessToken.length ||
            tokenKeys.refreshToken.length
        ) {
            this.setItem(
                CacheKeys.getTokenKeysCacheKey(this.clientId),
                JSON.stringify(tokenKeys)
            );
        } else {
            this.removeItem(CacheKeys.getTokenKeysCacheKey(this.clientId));
        }
    }

    /**
     * Helper to decrypt and save cache entries
     * @param key
     * @returns
     */
    private async getItemFromEncryptedCache(
        key: string,
        correlationId: string
    ): Promise<string | null> {
        if (!this.encryptionCookie) {
            return null;
        }

        const rawCache = this.getItem(key);
        if (!rawCache) {
            return null;
        }

        let encObj: EncryptedData;
        try {
            encObj = JSON.parse(rawCache);
        } catch (e) {
            // Not a valid encrypted object, remove
            return null;
        }

        if (!isEncrypted(encObj)) {
            // Data is not encrypted
            this.performanceClient.incrementFields(
                { unencryptedCacheCount: 1 },
                correlationId
            );
            return rawCache;
        }

        if (encObj.id !== this.encryptionCookie.id) {
            // Data was encrypted with a different key. It must be removed because it is from a previous session.
            this.performanceClient.incrementFields(
                { encryptedCacheExpiredCount: 1 },
                correlationId
            );
            return null;
        }

        this.performanceClient.incrementFields(
            { encryptedCacheCount: 1 },
            correlationId
        );

        return invokeAsync(
            decrypt,
            PerformanceEvents.Decrypt,
            this.logger,
            this.performanceClient,
            correlationId
        )(
            this.encryptionCookie.key,
            encObj.nonce,
            this.getContext(key),
            encObj.data
        );
    }

    /**
     * Helper to decrypt and save an array of cache keys
     * @param arr
     * @returns Array of keys successfully imported
     */
    private async importArray(
        arr: Array<string>,
        correlationId: string
    ): Promise<Array<string>> {
        const importedArr: Array<string> = [];
        const promiseArr: Array<Promise<void>> = [];
        arr.forEach((key) => {
            const promise = this.getItemFromEncryptedCache(
                key,
                correlationId
            ).then((value) => {
                if (value) {
                    this.memoryStorage.setItem(key, value);
                    importedArr.push(key);
                } else {
                    // If value is empty, unencrypted or expired remove
                    this.removeItem(key);
                }
            });
            promiseArr.push(promise);
        });

        await Promise.all(promiseArr);
        return importedArr;
    }

    /**
     * Gets encryption context for a given cache entry. This is clientId for app specific entries, empty string for shared entries
     * @param key
     * @returns
     */
    private getContext(key: string): string {
        let context = "";
        if (key.includes(this.clientId)) {
            context = this.clientId; // Used to bind encryption key to this appId
        }

        return context;
    }

    private updateCache(event: MessageEvent): void {
        this.logger.trace("Updating internal cache from broadcast event");
        const perfMeasurement = this.performanceClient.startMeasurement(
            PerformanceEvents.LocalStorageUpdated
        );
        perfMeasurement.add({ isBackground: true });

        const { key, value, context } = event.data;
        if (!key) {
            this.logger.error("Broadcast event missing key");
            perfMeasurement.end({ success: false, errorCode: "noKey" });
            return;
        }

        if (context && context !== this.clientId) {
            this.logger.trace(
                `Ignoring broadcast event from clientId: ${context}`
            );
            perfMeasurement.end({
                success: false,
                errorCode: "contextMismatch",
            });
            return;
        }

        if (!value) {
            this.memoryStorage.removeItem(key);
            this.logger.verbose("Removed item from internal cache");
        } else {
            this.memoryStorage.setItem(key, value);
            this.logger.verbose("Updated item in internal cache");
        }
        perfMeasurement.end({ success: true });
    }
}
