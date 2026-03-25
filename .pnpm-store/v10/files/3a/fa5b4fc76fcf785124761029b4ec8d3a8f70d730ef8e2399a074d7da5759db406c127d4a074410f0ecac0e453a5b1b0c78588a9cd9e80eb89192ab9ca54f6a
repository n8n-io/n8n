/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CacheManager, TimeUtils, CacheHelpers, DEFAULT_TOKEN_RENEWAL_OFFSET_SEC, AuthToken, getTenantIdFromIdTokenClaims, buildTenantProfile, AccountEntity, createCacheError, CacheErrorCodes, invokeAsync, PerformanceEvents, Constants, PersistentCacheKeys, StringUtils, AuthenticationScheme, CacheError, DEFAULT_CRYPTO_IMPLEMENTATION, CredentialType } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { BrowserCacheLocation, InMemoryCacheKeys, TemporaryCacheKeys, INTERACTION_TYPE } from '../utils/BrowserConstants.mjs';
import { ACCOUNT_SCHEMA_VERSION, CREDENTIAL_SCHEMA_VERSION, VERSION_CACHE_KEY, getTokenKeysCacheKey, getAccountKeysCacheKey, PREFIX, CACHE_KEY_SEPARATOR } from './CacheKeys.mjs';
import { LocalStorage } from './LocalStorage.mjs';
import { SessionStorage } from './SessionStorage.mjs';
import { MemoryStorage } from './MemoryStorage.mjs';
import { base64Decode } from '../encode/Base64Decode.mjs';
import { base64Encode } from '../encode/Base64Encode.mjs';
import { CookieStorage } from './CookieStorage.mjs';
import { getAccountKeys, getTokenKeys } from './CacheHelpers.mjs';
import { EventType } from '../event/EventType.mjs';
import { clearHash } from '../utils/BrowserUtils.mjs';
import { version } from '../packageMetadata.mjs';
import { removeElementFromArray } from '../utils/Helpers.mjs';
import { isEncrypted } from './EncryptedData.mjs';
import { noTokenRequestCacheError, unableToParseTokenRequestCacheError, interactionInProgress } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements the cache storage interface for MSAL through browser local or session storage.
 * Cookies are only used if storeAuthStateInCookie is true, and are only used for
 * parameters such as state and nonce, generally.
 */
class BrowserCacheManager extends CacheManager {
    constructor(clientId, cacheConfig, cryptoImpl, logger, performanceClient, eventHandler, staticAuthorityOptions) {
        super(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions);
        this.cacheConfig = cacheConfig;
        this.logger = logger;
        this.internalStorage = new MemoryStorage();
        this.browserStorage = getStorageImplementation(clientId, cacheConfig.cacheLocation, logger, performanceClient);
        this.temporaryCacheStorage = getStorageImplementation(clientId, cacheConfig.temporaryCacheLocation, logger, performanceClient);
        this.cookieStorage = new CookieStorage();
        this.eventHandler = eventHandler;
    }
    async initialize(correlationId) {
        this.performanceClient.addFields({
            cacheLocation: this.cacheConfig.cacheLocation,
            cacheRetentionDays: this.cacheConfig.cacheRetentionDays,
        }, correlationId);
        await this.browserStorage.initialize(correlationId);
        await this.migrateExistingCache(correlationId);
        this.trackVersionChanges(correlationId);
    }
    /**
     * Migrates any existing cache data from previous versions of MSAL.js into the current cache structure.
     */
    async migrateExistingCache(correlationId) {
        let accountKeys = getAccountKeys(this.browserStorage);
        let tokenKeys = getTokenKeys(this.clientId, this.browserStorage);
        this.performanceClient.addFields({
            preMigrateAcntCount: accountKeys.length,
            preMigrateATCount: tokenKeys.accessToken.length,
            preMigrateITCount: tokenKeys.idToken.length,
            preMigrateRTCount: tokenKeys.refreshToken.length,
        }, correlationId);
        for (let i = 0; i < ACCOUNT_SCHEMA_VERSION; i++) {
            const credentialSchema = i; // For now account and credential schemas are the same, but may diverge in future
            await this.removeStaleAccounts(i, credentialSchema, correlationId);
        }
        // Must migrate idTokens first to ensure we have KMSI info for the rest
        for (let i = 0; i < CREDENTIAL_SCHEMA_VERSION; i++) {
            const accountSchema = i; // For now account and credential schemas are the same, but may diverge in future
            await this.migrateIdTokens(i, accountSchema, correlationId);
        }
        const kmsiMap = this.getKMSIValues();
        for (let i = 0; i < CREDENTIAL_SCHEMA_VERSION; i++) {
            await this.migrateAccessTokens(i, kmsiMap, correlationId);
            await this.migrateRefreshTokens(i, kmsiMap, correlationId);
        }
        accountKeys = getAccountKeys(this.browserStorage);
        tokenKeys = getTokenKeys(this.clientId, this.browserStorage);
        this.performanceClient.addFields({
            postMigrateAcntCount: accountKeys.length,
            postMigrateATCount: tokenKeys.accessToken.length,
            postMigrateITCount: tokenKeys.idToken.length,
            postMigrateRTCount: tokenKeys.refreshToken.length,
        }, correlationId);
    }
    /**
     * Parses entry, adds lastUpdatedAt if it doesn't exist, removes entry if expired or invalid
     * @param key
     * @param correlationId
     * @returns
     */
    async updateOldEntry(key, correlationId) {
        const rawValue = this.browserStorage.getItem(key);
        const parsedValue = this.validateAndParseJson(rawValue || "");
        if (!parsedValue) {
            this.browserStorage.removeItem(key);
            return null;
        }
        if (!parsedValue.lastUpdatedAt) {
            // Add lastUpdatedAt to the existing v0 entry if it doesnt exist so we know when it's safe to remove it
            parsedValue.lastUpdatedAt = Date.now().toString();
            this.setItem(key, JSON.stringify(parsedValue), correlationId);
        }
        else if (TimeUtils.isCacheExpired(parsedValue.lastUpdatedAt, this.cacheConfig.cacheRetentionDays)) {
            this.browserStorage.removeItem(key);
            this.performanceClient.incrementFields({ expiredCacheRemovedCount: 1 }, correlationId);
            return null;
        }
        const decryptedData = isEncrypted(parsedValue)
            ? await this.browserStorage.decryptData(key, parsedValue, correlationId)
            : parsedValue;
        if (!decryptedData || !CacheHelpers.isCredentialEntity(decryptedData)) {
            this.performanceClient.incrementFields({ invalidCacheCount: 1 }, correlationId);
            return null;
        }
        if ((CacheHelpers.isAccessTokenEntity(decryptedData) ||
            CacheHelpers.isRefreshTokenEntity(decryptedData)) &&
            decryptedData.expiresOn &&
            TimeUtils.isTokenExpired(decryptedData.expiresOn, DEFAULT_TOKEN_RENEWAL_OFFSET_SEC)) {
            this.browserStorage.removeItem(key);
            this.performanceClient.incrementFields({ expiredCacheRemovedCount: 1 }, correlationId);
            return null;
        }
        return decryptedData;
    }
    /**
     * Remove accounts from the cache for older schema versions if they have not been updated in the last cacheRetentionDays
     * @param accountSchema
     * @param credentialSchema
     * @param correlationId
     * @returns
     */
    async removeStaleAccounts(accountSchema, credentialSchema, correlationId) {
        const accountKeysToCheck = getAccountKeys(this.browserStorage, accountSchema);
        if (accountKeysToCheck.length === 0) {
            return;
        }
        for (const accountKey of [...accountKeysToCheck]) {
            this.performanceClient.incrementFields({ oldAcntCount: 1 }, correlationId);
            const rawValue = this.browserStorage.getItem(accountKey);
            const parsedValue = this.validateAndParseJson(rawValue || "");
            if (!parsedValue) {
                removeElementFromArray(accountKeysToCheck, accountKey);
                continue;
            }
            if (!parsedValue.lastUpdatedAt) {
                // Add lastUpdatedAt to the existing entry if it doesnt exist so we know when it's safe to remove it
                parsedValue.lastUpdatedAt = Date.now().toString();
                this.setItem(accountKey, JSON.stringify(parsedValue), correlationId);
                continue;
            }
            else if (TimeUtils.isCacheExpired(parsedValue.lastUpdatedAt, this.cacheConfig.cacheRetentionDays)) {
                // Cache expired remove account and associated tokens
                await this.removeAccountOldSchema(accountKey, parsedValue, credentialSchema, correlationId);
                removeElementFromArray(accountKeysToCheck, accountKey);
            }
        }
        this.setAccountKeys(accountKeysToCheck, correlationId, accountSchema);
    }
    /**
     * Remove the given account and all associated tokens from the cache
     * @param accountKey
     * @param rawObject
     * @param credentialSchema
     * @param correlationId
     */
    async removeAccountOldSchema(accountKey, rawObject, credentialSchema, correlationId) {
        const decryptedData = isEncrypted(rawObject)
            ? (await this.browserStorage.decryptData(accountKey, rawObject, correlationId))
            : rawObject;
        const homeAccountId = decryptedData?.homeAccountId;
        if (homeAccountId) {
            const tokenKeys = this.getTokenKeys(credentialSchema);
            [...tokenKeys.idToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.idToken, key);
            });
            [...tokenKeys.accessToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.accessToken, key);
            });
            [...tokenKeys.refreshToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.refreshToken, key);
            });
            this.setTokenKeys(tokenKeys, correlationId, credentialSchema);
        }
        this.performanceClient.incrementFields({ expiredAcntRemovedCount: 1 }, correlationId);
        this.browserStorage.removeItem(accountKey);
    }
    /**
     * Gets key value pair mapping homeAccountId to KMSI value
     * @returns
     */
    getKMSIValues() {
        const kmsiMap = {};
        const tokenKeys = this.getTokenKeys().idToken;
        for (const key of tokenKeys) {
            const rawValue = this.browserStorage.getUserData(key);
            if (rawValue) {
                const idToken = JSON.parse(rawValue);
                const claims = AuthToken.extractTokenClaims(idToken.secret, base64Decode);
                if (claims) {
                    kmsiMap[idToken.homeAccountId] = AuthToken.isKmsi(claims);
                }
            }
        }
        return kmsiMap;
    }
    /**
     * Migrates id tokens from the old schema to the new schema, also migrates associated account object if it doesn't already exist in the new schema
     * @param credentialSchema
     * @param accountSchema
     * @param correlationId
     * @returns
     */
    async migrateIdTokens(credentialSchema, accountSchema, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.idToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        const currentAccountKeys = getAccountKeys(this.browserStorage);
        const previousAccountKeys = getAccountKeys(this.browserStorage, accountSchema);
        for (const idTokenKey of [...credentialKeysToMigrate.idToken]) {
            this.performanceClient.incrementFields({ oldITCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(idTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.idToken, idTokenKey);
                continue;
            }
            const currentAccountKey = currentAccountKeys.find((key) => key.includes(oldSchemaData.homeAccountId));
            const previousAccountKey = previousAccountKeys.find((key) => key.includes(oldSchemaData.homeAccountId));
            let account = null;
            if (currentAccountKey) {
                account = this.getAccount(currentAccountKey, correlationId);
            }
            else if (previousAccountKey) {
                const rawValue = this.browserStorage.getItem(previousAccountKey);
                const parsedValue = this.validateAndParseJson(rawValue || "");
                account =
                    parsedValue && isEncrypted(parsedValue)
                        ? (await this.browserStorage.decryptData(previousAccountKey, parsedValue, correlationId))
                        : parsedValue;
            }
            if (!account) {
                // Don't migrate idToken if we don't have an account for it
                this.performanceClient.incrementFields({ skipITMigrateCount: 1 }, correlationId);
                continue;
            }
            const claims = AuthToken.extractTokenClaims(oldSchemaData.secret, base64Decode);
            const newIdTokenKey = this.generateCredentialKey(oldSchemaData);
            const currentIdToken = this.getIdTokenCredential(newIdTokenKey, correlationId);
            const oldTokenHasSignInState = Object.keys(claims).includes("signin_state");
            const currentTokenHasSignInState = currentIdToken &&
                Object.keys(AuthToken.extractTokenClaims(currentIdToken.secret, base64Decode) || {}).includes("signin_state");
            /**
             * Only migrate if:
             * 1. Token doesn't yet exist in current schema
             * 2. Old schema token has been updated more recently than the current one AND migrating it won't result in loss of KMSI state
             */
            if (!currentIdToken ||
                (oldSchemaData.lastUpdatedAt > currentIdToken.lastUpdatedAt &&
                    (oldTokenHasSignInState || !currentTokenHasSignInState))) {
                const tenantProfiles = account.tenantProfiles || [];
                const tenantId = getTenantIdFromIdTokenClaims(claims) || account.realm;
                if (tenantId &&
                    !tenantProfiles.find((tenantProfile) => {
                        return tenantProfile.tenantId === tenantId;
                    })) {
                    const newTenantProfile = buildTenantProfile(account.homeAccountId, account.localAccountId, tenantId, claims);
                    tenantProfiles.push(newTenantProfile);
                }
                account.tenantProfiles = tenantProfiles;
                const newAccountKey = this.generateAccountKey(AccountEntity.getAccountInfo(account));
                const kmsi = AuthToken.isKmsi(claims);
                await this.setUserData(newAccountKey, JSON.stringify(account), correlationId, account.lastUpdatedAt, kmsi);
                if (!currentAccountKeys.includes(newAccountKey)) {
                    currentAccountKeys.push(newAccountKey);
                }
                await this.setUserData(newIdTokenKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedITCount: 1 }, correlationId);
                currentCredentialKeys.idToken.push(newIdTokenKey);
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
        this.setAccountKeys(currentAccountKeys, correlationId);
    }
    /**
     * Migrates access tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    async migrateAccessTokens(credentialSchema, kmsiMap, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.accessToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        for (const accessTokenKey of [...credentialKeysToMigrate.accessToken]) {
            this.performanceClient.incrementFields({ oldATCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(accessTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.accessToken, accessTokenKey);
                continue;
            }
            if (!Object.keys(kmsiMap).includes(oldSchemaData.homeAccountId)) {
                // Don't migrate tokens if we don't have an idToken for them
                this.performanceClient.incrementFields({ skipATMigrateCount: 1 }, correlationId);
                continue;
            }
            const newKey = this.generateCredentialKey(oldSchemaData);
            const kmsi = kmsiMap[oldSchemaData.homeAccountId];
            if (!currentCredentialKeys.accessToken.includes(newKey)) {
                await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedATCount: 1 }, correlationId);
                currentCredentialKeys.accessToken.push(newKey);
            }
            else {
                const currentToken = this.getAccessTokenCredential(newKey, correlationId);
                if (!currentToken ||
                    oldSchemaData.lastUpdatedAt > currentToken.lastUpdatedAt) {
                    // If the token already exists, only overwrite it if the old token has a more recent lastUpdatedAt
                    await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                    this.performanceClient.incrementFields({ migratedATCount: 1 }, correlationId);
                }
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
    }
    /**
     * Migrates refresh tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    async migrateRefreshTokens(credentialSchema, kmsiMap, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.refreshToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        for (const refreshTokenKey of [
            ...credentialKeysToMigrate.refreshToken,
        ]) {
            this.performanceClient.incrementFields({ oldRTCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(refreshTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.refreshToken, refreshTokenKey);
                continue;
            }
            if (!Object.keys(kmsiMap).includes(oldSchemaData.homeAccountId)) {
                // Don't migrate tokens if we don't have an idToken for them
                this.performanceClient.incrementFields({ skipRTMigrateCount: 1 }, correlationId);
                continue;
            }
            const newKey = this.generateCredentialKey(oldSchemaData);
            const kmsi = kmsiMap[oldSchemaData.homeAccountId];
            if (!currentCredentialKeys.refreshToken.includes(newKey)) {
                await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedRTCount: 1 }, correlationId);
                currentCredentialKeys.refreshToken.push(newKey);
            }
            else {
                const currentToken = this.getRefreshTokenCredential(newKey, correlationId);
                if (!currentToken ||
                    oldSchemaData.lastUpdatedAt > currentToken.lastUpdatedAt) {
                    // If the token already exists, only overwrite it if the old token has a more recent lastUpdatedAt
                    await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                    this.performanceClient.incrementFields({ migratedRTCount: 1 }, correlationId);
                }
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
    }
    /**
     * Tracks upgrades and downgrades for telemetry and debugging purposes
     */
    trackVersionChanges(correlationId) {
        const previousVersion = this.browserStorage.getItem(VERSION_CACHE_KEY);
        if (previousVersion) {
            this.logger.info(`MSAL.js was last initialized by version: ${previousVersion}`);
            this.performanceClient.addFields({ previousLibraryVersion: previousVersion }, correlationId);
        }
        if (previousVersion !== version) {
            this.setItem(VERSION_CACHE_KEY, version, correlationId);
        }
    }
    /**
     * Parses passed value as JSON object, JSON.parse() will throw an error.
     * @param input
     */
    validateAndParseJson(jsonValue) {
        if (!jsonValue) {
            return null;
        }
        try {
            const parsedJson = JSON.parse(jsonValue);
            /**
             * There are edge cases in which JSON.parse will successfully parse a non-valid JSON object
             * (e.g. JSON.parse will parse an escaped string into an unescaped string), so adding a type check
             * of the parsed value is necessary in order to be certain that the string represents a valid JSON object.
             *
             */
            return parsedJson && typeof parsedJson === "object"
                ? parsedJson
                : null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Helper to setItem in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     */
    setItem(key, value, correlationId) {
        const tokenKeysCount = new Array(CREDENTIAL_SCHEMA_VERSION + 1).fill(0); // Array mapping schema version to number of token keys stored for that version
        const accessTokenKeys = []; // Flat map of all access token keys stored, ordered by schema version
        const maxRetries = 20;
        for (let i = 0; i <= maxRetries; i++) {
            // Attempt to store item in cache, if cache is full this call will throw and we'll attempt to clear space by removing access tokens from the cache one by one, starting with tokens stored by previous versions of MSAL.js
            try {
                this.browserStorage.setItem(key, value);
                if (i > 0) {
                    // If any tokens were removed in order to store this item update the token keys array with the tokens removed
                    for (let schemaVersion = 0; schemaVersion <= CREDENTIAL_SCHEMA_VERSION; schemaVersion++) {
                        // Get the sum of all previous token counts to use as start index for this schema version
                        const startIndex = tokenKeysCount
                            .slice(0, schemaVersion)
                            .reduce((sum, count) => sum + count, 0);
                        if (startIndex >= i) {
                            // Done removing tokens
                            break;
                        }
                        const endIndex = i > startIndex + tokenKeysCount[schemaVersion]
                            ? startIndex + tokenKeysCount[schemaVersion]
                            : i;
                        if (i > startIndex &&
                            tokenKeysCount[schemaVersion] > 0) {
                            this.removeAccessTokenKeys(accessTokenKeys.slice(startIndex, endIndex), correlationId, schemaVersion);
                        }
                    }
                }
                break; // If setItem succeeds, exit the loop
            }
            catch (e) {
                const cacheError = createCacheError(e);
                if (cacheError.errorCode ===
                    CacheErrorCodes.cacheQuotaExceeded &&
                    i < maxRetries) {
                    if (!accessTokenKeys.length) {
                        // If we are currently trying to set the token keys, use the value we're trying to set
                        for (let i = 0; i <= CREDENTIAL_SCHEMA_VERSION; i++) {
                            if (key ===
                                getTokenKeysCacheKey(this.clientId, i)) {
                                const tokenKeys = JSON.parse(value).accessToken;
                                accessTokenKeys.push(...tokenKeys);
                                tokenKeysCount[i] = tokenKeys.length;
                            }
                            else {
                                const tokenKeys = this.getTokenKeys(i).accessToken;
                                accessTokenKeys.push(...tokenKeys);
                                tokenKeysCount[i] = tokenKeys.length;
                            }
                        }
                    }
                    if (accessTokenKeys.length <= i) {
                        // Nothing to remove, rethrow the error
                        throw cacheError;
                    }
                    // When cache quota is exceeded, start removing access tokens until we can successfully set the item
                    this.removeAccessToken(accessTokenKeys[i], correlationId, false // Don't save token keys yet, do it at the end
                    );
                }
                else {
                    // If the error is not a quota exceeded error, rethrow it
                    throw cacheError;
                }
            }
        }
    }
    /**
     * Helper to setUserData in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     * @param correlationId
     */
    async setUserData(key, value, correlationId, timestamp, kmsi) {
        const tokenKeysCount = new Array(CREDENTIAL_SCHEMA_VERSION + 1).fill(0); // Array mapping schema version to number of token keys stored for that version
        const accessTokenKeys = []; // Flat map of all access token keys stored, ordered by schema version
        const maxRetries = 20;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                // Attempt to store item in cache, if cache is full this call will throw and we'll attempt to clear space by removing access tokens from the cache one by one, starting with tokens stored by previous versions of MSAL.js
                await invokeAsync(this.browserStorage.setUserData.bind(this.browserStorage), PerformanceEvents.SetUserData, this.logger, this.performanceClient)(key, value, correlationId, timestamp, kmsi);
                if (i > 0) {
                    // If any tokens were removed in order to store this item update the token keys array with the tokens removed
                    for (let schemaVersion = 0; schemaVersion <= CREDENTIAL_SCHEMA_VERSION; schemaVersion++) {
                        // Get the sum of all previous token counts to use as start index for this schema version
                        const startIndex = tokenKeysCount
                            .slice(0, schemaVersion)
                            .reduce((sum, count) => sum + count, 0);
                        if (startIndex >= i) {
                            // Done removing tokens
                            break;
                        }
                        const endIndex = i > startIndex + tokenKeysCount[schemaVersion]
                            ? startIndex + tokenKeysCount[schemaVersion]
                            : i;
                        if (i > startIndex &&
                            tokenKeysCount[schemaVersion] > 0) {
                            this.removeAccessTokenKeys(accessTokenKeys.slice(startIndex, endIndex), correlationId, schemaVersion);
                        }
                    }
                }
                break; // If setItem succeeds, exit the loop
            }
            catch (e) {
                const cacheError = createCacheError(e);
                if (cacheError.errorCode ===
                    CacheErrorCodes.cacheQuotaExceeded &&
                    i < maxRetries) {
                    if (!accessTokenKeys.length) {
                        // If we are currently trying to set the token keys, use the value we're trying to set
                        for (let i = 0; i <= CREDENTIAL_SCHEMA_VERSION; i++) {
                            const tokenKeys = this.getTokenKeys(i).accessToken;
                            accessTokenKeys.push(...tokenKeys);
                            tokenKeysCount[i] = tokenKeys.length;
                        }
                    }
                    if (accessTokenKeys.length <= i) {
                        // Nothing left to remove, rethrow the error
                        throw cacheError;
                    }
                    // When cache quota is exceeded, start removing access tokens until we can successfully set the item
                    this.removeAccessToken(accessTokenKeys[i], correlationId, false // Don't save token keys yet, do it at the end
                    );
                }
                else {
                    // If the error is not a quota exceeded error, rethrow it
                    throw cacheError;
                }
            }
        }
    }
    /**
     * Reads account from cache, deserializes it into an account entity and returns it.
     * If account is not found from the key, returns null and removes key from map.
     * @param accountKey
     * @returns
     */
    getAccount(accountKey, correlationId) {
        this.logger.trace("BrowserCacheManager.getAccount called");
        const serializedAccount = this.browserStorage.getUserData(accountKey);
        if (!serializedAccount) {
            this.removeAccountKeyFromMap(accountKey, correlationId);
            return null;
        }
        const parsedAccount = this.validateAndParseJson(serializedAccount);
        if (!parsedAccount || !AccountEntity.isAccountEntity(parsedAccount)) {
            return null;
        }
        return CacheManager.toObject(new AccountEntity(), parsedAccount);
    }
    /**
     * set account entity in the platform cache
     * @param account
     */
    async setAccount(account, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setAccount called");
        const key = this.generateAccountKey(AccountEntity.getAccountInfo(account));
        const timestamp = Date.now().toString();
        account.lastUpdatedAt = timestamp;
        await this.setUserData(key, JSON.stringify(account), correlationId, timestamp, kmsi);
        const wasAdded = this.addAccountKeyToMap(key, correlationId);
        this.performanceClient.addFields({ kmsi: kmsi }, correlationId);
        /**
         * @deprecated - Remove this in next major version in favor of more consistent LOGIN event
         */
        if (this.cacheConfig.cacheLocation ===
            BrowserCacheLocation.LocalStorage &&
            wasAdded) {
            this.eventHandler.emitEvent(EventType.ACCOUNT_ADDED, undefined, AccountEntity.getAccountInfo(account));
        }
    }
    /**
     * Returns the array of account keys currently cached
     * @returns
     */
    getAccountKeys() {
        return getAccountKeys(this.browserStorage);
    }
    setAccountKeys(accountKeys, correlationId, schemaVersion = ACCOUNT_SCHEMA_VERSION) {
        if (accountKeys.length === 0) {
            this.removeItem(getAccountKeysCacheKey(schemaVersion));
        }
        else {
            this.setItem(getAccountKeysCacheKey(schemaVersion), JSON.stringify(accountKeys), correlationId);
        }
    }
    /**
     * Add a new account to the key map
     * @param key
     */
    addAccountKeyToMap(key, correlationId) {
        this.logger.trace("BrowserCacheManager.addAccountKeyToMap called");
        this.logger.tracePii(`BrowserCacheManager.addAccountKeyToMap called with key: ${key}`);
        const accountKeys = this.getAccountKeys();
        if (accountKeys.indexOf(key) === -1) {
            // Only add key if it does not already exist in the map
            accountKeys.push(key);
            this.setItem(getAccountKeysCacheKey(), JSON.stringify(accountKeys), correlationId);
            this.logger.verbose("BrowserCacheManager.addAccountKeyToMap account key added");
            return true;
        }
        else {
            this.logger.verbose("BrowserCacheManager.addAccountKeyToMap account key already exists in map");
            return false;
        }
    }
    /**
     * Remove an account from the key map
     * @param key
     */
    removeAccountKeyFromMap(key, correlationId) {
        this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap called");
        this.logger.tracePii(`BrowserCacheManager.removeAccountKeyFromMap called with key: ${key}`);
        const accountKeys = this.getAccountKeys();
        const removalIndex = accountKeys.indexOf(key);
        if (removalIndex > -1) {
            accountKeys.splice(removalIndex, 1);
            this.setAccountKeys(accountKeys, correlationId);
            this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap account key removed");
        }
        else {
            this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap key not found in existing map");
        }
    }
    /**
     * Extends inherited removeAccount function to include removal of the account key from the map
     * @param key
     */
    removeAccount(account, correlationId) {
        const activeAccount = this.getActiveAccount(correlationId);
        if (activeAccount?.homeAccountId === account.homeAccountId &&
            activeAccount?.environment === account.environment) {
            this.setActiveAccount(null, correlationId);
        }
        super.removeAccount(account, correlationId);
        this.removeAccountKeyFromMap(this.generateAccountKey(account), correlationId);
        // Remove all other associated cache items
        this.browserStorage.getKeys().forEach((key) => {
            if (key.includes(account.homeAccountId) &&
                key.includes(account.environment)) {
                this.browserStorage.removeItem(key);
            }
        });
        /**
         * @deprecated - Remove this in next major version in favor of more consistent LOGOUT event
         */
        if (this.cacheConfig.cacheLocation === BrowserCacheLocation.LocalStorage) {
            this.eventHandler.emitEvent(EventType.ACCOUNT_REMOVED, undefined, account);
        }
    }
    /**
     * Removes given idToken from the cache and from the key map
     * @param key
     */
    removeIdToken(key, correlationId) {
        super.removeIdToken(key, correlationId);
        const tokenKeys = this.getTokenKeys();
        const idRemoval = tokenKeys.idToken.indexOf(key);
        if (idRemoval > -1) {
            this.logger.info("idToken removed from tokenKeys map");
            tokenKeys.idToken.splice(idRemoval, 1);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * Removes given accessToken from the cache and from the key map
     * @param key
     */
    removeAccessToken(key, correlationId, updateTokenKeys = true) {
        super.removeAccessToken(key, correlationId);
        updateTokenKeys && this.removeAccessTokenKeys([key], correlationId);
    }
    /**
     * Remove access token key from the key map
     * @param key
     * @param correlationId
     * @param tokenKeys
     */
    removeAccessTokenKeys(keys, correlationId, schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        this.logger.trace("removeAccessTokenKey called");
        const tokenKeys = this.getTokenKeys(schemaVersion);
        let keysRemoved = 0;
        keys.forEach((key) => {
            const accessRemoval = tokenKeys.accessToken.indexOf(key);
            if (accessRemoval > -1) {
                tokenKeys.accessToken.splice(accessRemoval, 1);
                keysRemoved++;
            }
        });
        if (keysRemoved > 0) {
            this.logger.info(`removed ${keysRemoved} accessToken keys from tokenKeys map`);
            this.setTokenKeys(tokenKeys, correlationId, schemaVersion);
            return;
        }
    }
    /**
     * Removes given refreshToken from the cache and from the key map
     * @param key
     */
    removeRefreshToken(key, correlationId) {
        super.removeRefreshToken(key, correlationId);
        const tokenKeys = this.getTokenKeys();
        const refreshRemoval = tokenKeys.refreshToken.indexOf(key);
        if (refreshRemoval > -1) {
            this.logger.info("refreshToken removed from tokenKeys map");
            tokenKeys.refreshToken.splice(refreshRemoval, 1);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * Gets the keys for the cached tokens associated with this clientId
     * @returns
     */
    getTokenKeys(schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        return getTokenKeys(this.clientId, this.browserStorage, schemaVersion);
    }
    /**
     * Stores the token keys in the cache
     * @param tokenKeys
     * @param correlationId
     * @returns
     */
    setTokenKeys(tokenKeys, correlationId, schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        if (tokenKeys.idToken.length === 0 &&
            tokenKeys.accessToken.length === 0 &&
            tokenKeys.refreshToken.length === 0) {
            // If no keys left, remove the map
            this.removeItem(getTokenKeysCacheKey(this.clientId, schemaVersion));
            return;
        }
        else {
            this.setItem(getTokenKeysCacheKey(this.clientId, schemaVersion), JSON.stringify(tokenKeys), correlationId);
        }
    }
    /**
     * generates idToken entity from a string
     * @param idTokenKey
     */
    getIdTokenCredential(idTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(idTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getIdTokenCredential: called, no cache hit");
            this.removeIdToken(idTokenKey, correlationId);
            return null;
        }
        const parsedIdToken = this.validateAndParseJson(value);
        if (!parsedIdToken || !CacheHelpers.isIdTokenEntity(parsedIdToken)) {
            this.logger.trace("BrowserCacheManager.getIdTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getIdTokenCredential: cache hit");
        return parsedIdToken;
    }
    /**
     * set IdToken credential to the platform cache
     * @param idToken
     */
    async setIdTokenCredential(idToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setIdTokenCredential called");
        const idTokenKey = this.generateCredentialKey(idToken);
        const timestamp = Date.now().toString();
        idToken.lastUpdatedAt = timestamp;
        await this.setUserData(idTokenKey, JSON.stringify(idToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        if (tokenKeys.idToken.indexOf(idTokenKey) === -1) {
            this.logger.info("BrowserCacheManager: addTokenKey - idToken added to map");
            tokenKeys.idToken.push(idTokenKey);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * generates accessToken entity from a string
     * @param key
     */
    getAccessTokenCredential(accessTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(accessTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAccessTokenCredential: called, no cache hit");
            this.removeAccessTokenKeys([accessTokenKey], correlationId);
            return null;
        }
        const parsedAccessToken = this.validateAndParseJson(value);
        if (!parsedAccessToken ||
            !CacheHelpers.isAccessTokenEntity(parsedAccessToken)) {
            this.logger.trace("BrowserCacheManager.getAccessTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getAccessTokenCredential: cache hit");
        return parsedAccessToken;
    }
    /**
     * set accessToken credential to the platform cache
     * @param accessToken
     */
    async setAccessTokenCredential(accessToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setAccessTokenCredential called");
        const accessTokenKey = this.generateCredentialKey(accessToken);
        const timestamp = Date.now().toString();
        accessToken.lastUpdatedAt = timestamp;
        await this.setUserData(accessTokenKey, JSON.stringify(accessToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        const index = tokenKeys.accessToken.indexOf(accessTokenKey);
        if (index !== -1) {
            tokenKeys.accessToken.splice(index, 1); // Remove existing key before pushing to the end
        }
        this.logger.trace(`access token ${index === -1 ? "added to" : "updated in"} map`);
        tokenKeys.accessToken.push(accessTokenKey);
        this.setTokenKeys(tokenKeys, correlationId);
    }
    /**
     * generates refreshToken entity from a string
     * @param refreshTokenKey
     */
    getRefreshTokenCredential(refreshTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(refreshTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: called, no cache hit");
            this.removeRefreshToken(refreshTokenKey, correlationId);
            return null;
        }
        const parsedRefreshToken = this.validateAndParseJson(value);
        if (!parsedRefreshToken ||
            !CacheHelpers.isRefreshTokenEntity(parsedRefreshToken)) {
            this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: cache hit");
        return parsedRefreshToken;
    }
    /**
     * set refreshToken credential to the platform cache
     * @param refreshToken
     */
    async setRefreshTokenCredential(refreshToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setRefreshTokenCredential called");
        const refreshTokenKey = this.generateCredentialKey(refreshToken);
        const timestamp = Date.now().toString();
        refreshToken.lastUpdatedAt = timestamp;
        await this.setUserData(refreshTokenKey, JSON.stringify(refreshToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        if (tokenKeys.refreshToken.indexOf(refreshTokenKey) === -1) {
            this.logger.info("BrowserCacheManager: addTokenKey - refreshToken added to map");
            tokenKeys.refreshToken.push(refreshTokenKey);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    getAppMetadata(appMetadataKey) {
        const value = this.browserStorage.getItem(appMetadataKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAppMetadata: called, no cache hit");
            return null;
        }
        const parsedMetadata = this.validateAndParseJson(value);
        if (!parsedMetadata ||
            !CacheHelpers.isAppMetadataEntity(appMetadataKey, parsedMetadata)) {
            this.logger.trace("BrowserCacheManager.getAppMetadata: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getAppMetadata: cache hit");
        return parsedMetadata;
    }
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    setAppMetadata(appMetadata, correlationId) {
        this.logger.trace("BrowserCacheManager.setAppMetadata called");
        const appMetadataKey = CacheHelpers.generateAppMetadataKey(appMetadata);
        this.setItem(appMetadataKey, JSON.stringify(appMetadata), correlationId);
    }
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    getServerTelemetry(serverTelemetryKey) {
        const value = this.browserStorage.getItem(serverTelemetryKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getServerTelemetry: called, no cache hit");
            return null;
        }
        const parsedEntity = this.validateAndParseJson(value);
        if (!parsedEntity ||
            !CacheHelpers.isServerTelemetryEntity(serverTelemetryKey, parsedEntity)) {
            this.logger.trace("BrowserCacheManager.getServerTelemetry: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getServerTelemetry: cache hit");
        return parsedEntity;
    }
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    setServerTelemetry(serverTelemetryKey, serverTelemetry, correlationId) {
        this.logger.trace("BrowserCacheManager.setServerTelemetry called");
        this.setItem(serverTelemetryKey, JSON.stringify(serverTelemetry), correlationId);
    }
    /**
     *
     */
    getAuthorityMetadata(key) {
        const value = this.internalStorage.getItem(key);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAuthorityMetadata: called, no cache hit");
            return null;
        }
        const parsedMetadata = this.validateAndParseJson(value);
        if (parsedMetadata &&
            CacheHelpers.isAuthorityMetadataEntity(key, parsedMetadata)) {
            this.logger.trace("BrowserCacheManager.getAuthorityMetadata: cache hit");
            return parsedMetadata;
        }
        return null;
    }
    /**
     *
     */
    getAuthorityMetadataKeys() {
        const allKeys = this.internalStorage.getKeys();
        return allKeys.filter((key) => {
            return this.isAuthorityMetadata(key);
        });
    }
    /**
     * Sets wrapper metadata in memory
     * @param wrapperSKU
     * @param wrapperVersion
     */
    setWrapperMetadata(wrapperSKU, wrapperVersion) {
        this.internalStorage.setItem(InMemoryCacheKeys.WRAPPER_SKU, wrapperSKU);
        this.internalStorage.setItem(InMemoryCacheKeys.WRAPPER_VER, wrapperVersion);
    }
    /**
     * Returns wrapper metadata from in-memory storage
     */
    getWrapperMetadata() {
        const sku = this.internalStorage.getItem(InMemoryCacheKeys.WRAPPER_SKU) ||
            Constants.EMPTY_STRING;
        const version = this.internalStorage.getItem(InMemoryCacheKeys.WRAPPER_VER) ||
            Constants.EMPTY_STRING;
        return [sku, version];
    }
    /**
     *
     * @param entity
     */
    setAuthorityMetadata(key, entity) {
        this.logger.trace("BrowserCacheManager.setAuthorityMetadata called");
        this.internalStorage.setItem(key, JSON.stringify(entity));
    }
    /**
     * Gets the active account
     */
    getActiveAccount(correlationId) {
        const activeAccountKeyFilters = this.generateCacheKey(PersistentCacheKeys.ACTIVE_ACCOUNT_FILTERS);
        const activeAccountValueFilters = this.browserStorage.getItem(activeAccountKeyFilters);
        if (!activeAccountValueFilters) {
            this.logger.trace("BrowserCacheManager.getActiveAccount: No active account filters found");
            return null;
        }
        const activeAccountValueObj = this.validateAndParseJson(activeAccountValueFilters);
        if (activeAccountValueObj) {
            this.logger.trace("BrowserCacheManager.getActiveAccount: Active account filters schema found");
            return this.getAccountInfoFilteredBy({
                homeAccountId: activeAccountValueObj.homeAccountId,
                localAccountId: activeAccountValueObj.localAccountId,
                tenantId: activeAccountValueObj.tenantId,
            }, correlationId);
        }
        this.logger.trace("BrowserCacheManager.getActiveAccount: No active account found");
        return null;
    }
    /**
     * Sets the active account's localAccountId in cache
     * @param account
     */
    setActiveAccount(account, correlationId) {
        const activeAccountKey = this.generateCacheKey(PersistentCacheKeys.ACTIVE_ACCOUNT_FILTERS);
        if (account) {
            this.logger.verbose("setActiveAccount: Active account set");
            const activeAccountValue = {
                homeAccountId: account.homeAccountId,
                localAccountId: account.localAccountId,
                tenantId: account.tenantId,
                lastUpdatedAt: TimeUtils.nowSeconds().toString(),
            };
            this.setItem(activeAccountKey, JSON.stringify(activeAccountValue), correlationId);
        }
        else {
            this.logger.verbose("setActiveAccount: No account passed, active account not set");
            this.browserStorage.removeItem(activeAccountKey);
        }
        this.eventHandler.emitEvent(EventType.ACTIVE_ACCOUNT_CHANGED);
    }
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    getThrottlingCache(throttlingCacheKey) {
        const value = this.browserStorage.getItem(throttlingCacheKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getThrottlingCache: called, no cache hit");
            return null;
        }
        const parsedThrottlingCache = this.validateAndParseJson(value);
        if (!parsedThrottlingCache ||
            !CacheHelpers.isThrottlingEntity(throttlingCacheKey, parsedThrottlingCache)) {
            this.logger.trace("BrowserCacheManager.getThrottlingCache: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getThrottlingCache: cache hit");
        return parsedThrottlingCache;
    }
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    setThrottlingCache(throttlingCacheKey, throttlingCache, correlationId) {
        this.logger.trace("BrowserCacheManager.setThrottlingCache called");
        this.setItem(throttlingCacheKey, JSON.stringify(throttlingCache), correlationId);
    }
    /**
     * Gets cache item with given key.
     * Will retrieve from cookies if storeAuthStateInCookie is set to true.
     * @param key
     */
    getTemporaryCache(cacheKey, generateKey) {
        const key = generateKey ? this.generateCacheKey(cacheKey) : cacheKey;
        if (this.cacheConfig.storeAuthStateInCookie) {
            const itemCookie = this.cookieStorage.getItem(key);
            if (itemCookie) {
                this.logger.trace("BrowserCacheManager.getTemporaryCache: storeAuthStateInCookies set to true, retrieving from cookies");
                return itemCookie;
            }
        }
        const value = this.temporaryCacheStorage.getItem(key);
        if (!value) {
            // If temp cache item not found in session/memory, check local storage for items set by old versions
            if (this.cacheConfig.cacheLocation ===
                BrowserCacheLocation.LocalStorage) {
                const item = this.browserStorage.getItem(key);
                if (item) {
                    this.logger.trace("BrowserCacheManager.getTemporaryCache: Temporary cache item found in local storage");
                    return item;
                }
            }
            this.logger.trace("BrowserCacheManager.getTemporaryCache: No cache item found in local storage");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getTemporaryCache: Temporary cache item returned");
        return value;
    }
    /**
     * Sets the cache item with the key and value given.
     * Stores in cookie if storeAuthStateInCookie is set to true.
     * This can cause cookie overflow if used incorrectly.
     * @param key
     * @param value
     */
    setTemporaryCache(cacheKey, value, generateKey) {
        const key = generateKey ? this.generateCacheKey(cacheKey) : cacheKey;
        this.temporaryCacheStorage.setItem(key, value);
        if (this.cacheConfig.storeAuthStateInCookie) {
            this.logger.trace("BrowserCacheManager.setTemporaryCache: storeAuthStateInCookie set to true, setting item cookie");
            this.cookieStorage.setItem(key, value, undefined, this.cacheConfig.secureCookies);
        }
    }
    /**
     * Removes the cache item with the given key.
     * @param key
     */
    removeItem(key) {
        this.browserStorage.removeItem(key);
    }
    /**
     * Removes the temporary cache item with the given key.
     * Will also clear the cookie item if storeAuthStateInCookie is set to true.
     * @param key
     */
    removeTemporaryItem(key) {
        this.temporaryCacheStorage.removeItem(key);
        if (this.cacheConfig.storeAuthStateInCookie) {
            this.logger.trace("BrowserCacheManager.removeItem: storeAuthStateInCookie is true, clearing item cookie");
            this.cookieStorage.removeItem(key);
        }
    }
    /**
     * Gets all keys in window.
     */
    getKeys() {
        return this.browserStorage.getKeys();
    }
    /**
     * Clears all cache entries created by MSAL.
     */
    clear(correlationId) {
        // Removes all accounts and their credentials
        this.removeAllAccounts(correlationId);
        this.removeAppMetadata(correlationId);
        // Remove temp storage first to make sure any cookies are cleared
        this.temporaryCacheStorage.getKeys().forEach((cacheKey) => {
            if (cacheKey.indexOf(PREFIX) !== -1 ||
                cacheKey.indexOf(this.clientId) !== -1) {
                this.removeTemporaryItem(cacheKey);
            }
        });
        // Removes all remaining MSAL cache items
        this.browserStorage.getKeys().forEach((cacheKey) => {
            if (cacheKey.indexOf(PREFIX) !== -1 ||
                cacheKey.indexOf(this.clientId) !== -1) {
                this.browserStorage.removeItem(cacheKey);
            }
        });
        this.internalStorage.clear();
    }
    /**
     * Clears all access tokes that have claims prior to saving the current one
     * @param performanceClient {IPerformanceClient}
     * @param correlationId {string} correlation id
     * @returns
     */
    clearTokensAndKeysWithClaims(correlationId) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.ClearTokensAndKeysWithClaims, correlationId);
        const tokenKeys = this.getTokenKeys();
        let removedAccessTokens = 0;
        tokenKeys.accessToken.forEach((key) => {
            // if the access token has claims in its key, remove the token key and the token
            const credential = this.getAccessTokenCredential(key, correlationId);
            if (credential?.requestedClaimsHash &&
                key.includes(credential.requestedClaimsHash.toLowerCase())) {
                this.removeAccessToken(key, correlationId);
                removedAccessTokens++;
            }
        });
        // warn if any access tokens are removed
        if (removedAccessTokens > 0) {
            this.logger.warning(`${removedAccessTokens} access tokens with claims in the cache keys have been removed from the cache.`);
        }
    }
    /**
     * Prepend msal.<client-id> to each key
     * @param key
     * @param addInstanceId
     */
    generateCacheKey(key) {
        if (StringUtils.startsWith(key, PREFIX)) {
            return key;
        }
        return `${PREFIX}.${this.clientId}.${key}`;
    }
    /**
     * Cache Key: msal.<schema_version>-<home_account_id>-<environment>-<credential_type>-<client_id or familyId>-<realm>-<scopes>-<claims hash>-<scheme>
     * IdToken Example: uid.utid-login.microsoftonline.com-idtoken-app_client_id-contoso.com
     * AccessToken Example: uid.utid-login.microsoftonline.com-accesstoken-app_client_id-contoso.com-scope1 scope2--pop
     * RefreshToken Example: uid.utid-login.microsoftonline.com-refreshtoken-1-contoso.com
     * @param credentialEntity
     * @returns
     */
    generateCredentialKey(credential) {
        const familyId = (credential.credentialType === CredentialType.REFRESH_TOKEN &&
            credential.familyId) ||
            credential.clientId;
        const scheme = credential.tokenType &&
            credential.tokenType.toLowerCase() !==
                AuthenticationScheme.BEARER.toLowerCase()
            ? credential.tokenType.toLowerCase()
            : "";
        const credentialKey = [
            `${PREFIX}.${CREDENTIAL_SCHEMA_VERSION}`,
            credential.homeAccountId,
            credential.environment,
            credential.credentialType,
            familyId,
            credential.realm || "",
            credential.target || "",
            credential.requestedClaimsHash || "",
            scheme,
        ];
        return credentialKey.join(CACHE_KEY_SEPARATOR).toLowerCase();
    }
    /**
     * Cache Key: msal.<schema_version>.<home_account_id>.<environment>.<tenant_id>
     * @param account
     * @returns
     */
    generateAccountKey(account) {
        const homeTenantId = account.homeAccountId.split(".")[1];
        const accountKey = [
            `${PREFIX}.${ACCOUNT_SCHEMA_VERSION}`,
            account.homeAccountId,
            account.environment,
            homeTenantId || account.tenantId || "",
        ];
        return accountKey.join(CACHE_KEY_SEPARATOR).toLowerCase();
    }
    /**
     * Reset all temporary cache items
     * @param state
     */
    resetRequestCache() {
        this.logger.trace("BrowserCacheManager.resetRequestCache called");
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.REQUEST_PARAMS));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.VERIFIER));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.ORIGIN_URI));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.URL_HASH));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.NATIVE_REQUEST));
        this.setInteractionInProgress(false);
    }
    cacheAuthorizeRequest(authCodeRequest, codeVerifier) {
        this.logger.trace("BrowserCacheManager.cacheAuthorizeRequest called");
        const encodedValue = base64Encode(JSON.stringify(authCodeRequest));
        this.setTemporaryCache(TemporaryCacheKeys.REQUEST_PARAMS, encodedValue, true);
        if (codeVerifier) {
            const encodedVerifier = base64Encode(codeVerifier);
            this.setTemporaryCache(TemporaryCacheKeys.VERIFIER, encodedVerifier, true);
        }
    }
    /**
     * Gets the token exchange parameters from the cache. Throws an error if nothing is found.
     */
    getCachedRequest() {
        this.logger.trace("BrowserCacheManager.getCachedRequest called");
        // Get token request from cache and parse as TokenExchangeParameters.
        const encodedTokenRequest = this.getTemporaryCache(TemporaryCacheKeys.REQUEST_PARAMS, true);
        if (!encodedTokenRequest) {
            throw createBrowserAuthError(noTokenRequestCacheError);
        }
        const encodedVerifier = this.getTemporaryCache(TemporaryCacheKeys.VERIFIER, true);
        let parsedRequest;
        let verifier = "";
        try {
            parsedRequest = JSON.parse(base64Decode(encodedTokenRequest));
            if (encodedVerifier) {
                verifier = base64Decode(encodedVerifier);
            }
        }
        catch (e) {
            this.logger.errorPii(`Attempted to parse: ${encodedTokenRequest}`);
            this.logger.error(`Parsing cached token request threw with error: ${e}`);
            throw createBrowserAuthError(unableToParseTokenRequestCacheError);
        }
        return [parsedRequest, verifier];
    }
    /**
     * Gets cached native request for redirect flows
     */
    getCachedNativeRequest() {
        this.logger.trace("BrowserCacheManager.getCachedNativeRequest called");
        const cachedRequest = this.getTemporaryCache(TemporaryCacheKeys.NATIVE_REQUEST, true);
        if (!cachedRequest) {
            this.logger.trace("BrowserCacheManager.getCachedNativeRequest: No cached native request found");
            return null;
        }
        const parsedRequest = this.validateAndParseJson(cachedRequest);
        if (!parsedRequest) {
            this.logger.error("BrowserCacheManager.getCachedNativeRequest: Unable to parse native request");
            return null;
        }
        return parsedRequest;
    }
    isInteractionInProgress(matchClientId) {
        const clientId = this.getInteractionInProgress()?.clientId;
        if (matchClientId) {
            return clientId === this.clientId;
        }
        else {
            return !!clientId;
        }
    }
    getInteractionInProgress() {
        const key = `${PREFIX}.${TemporaryCacheKeys.INTERACTION_STATUS_KEY}`;
        const value = this.getTemporaryCache(key, false);
        try {
            return value ? JSON.parse(value) : null;
        }
        catch (e) {
            // Remove interaction and other temp keys if interaction status can't be parsed
            this.logger.error(`Cannot parse interaction status. Removing temporary cache items and clearing url hash. Retrying interaction should fix the error`);
            this.removeTemporaryItem(key);
            this.resetRequestCache();
            clearHash(window);
            return null;
        }
    }
    setInteractionInProgress(inProgress, type = INTERACTION_TYPE.SIGNIN) {
        // Ensure we don't overwrite interaction in progress for a different clientId
        const key = `${PREFIX}.${TemporaryCacheKeys.INTERACTION_STATUS_KEY}`;
        if (inProgress) {
            if (this.getInteractionInProgress()) {
                throw createBrowserAuthError(interactionInProgress);
            }
            else {
                // No interaction is in progress
                this.setTemporaryCache(key, JSON.stringify({ clientId: this.clientId, type }), false);
            }
        }
        else if (!inProgress &&
            this.getInteractionInProgress()?.clientId === this.clientId) {
            this.removeTemporaryItem(key);
        }
    }
    /**
     * Builds credential entities from AuthenticationResult object and saves the resulting credentials to the cache
     * @param result
     * @param request
     */
    async hydrateCache(result, request) {
        const idTokenEntity = CacheHelpers.createIdTokenEntity(result.account?.homeAccountId, result.account?.environment, result.idToken, this.clientId, result.tenantId);
        let claimsHash;
        if (request.claims) {
            claimsHash = await this.cryptoImpl.hashString(request.claims);
        }
        /**
         * meta data for cache stores time in seconds from epoch
         * AuthenticationResult returns expiresOn and extExpiresOn in milliseconds (as a Date object which is in ms)
         * We need to map these for the cache when building tokens from AuthenticationResult
         *
         * The next MSAL VFuture should map these both to same value if possible
         */
        const accessTokenEntity = CacheHelpers.createAccessTokenEntity(result.account?.homeAccountId, result.account.environment, result.accessToken, this.clientId, result.tenantId, result.scopes.join(" "), 
        // Access token expiresOn stored in seconds, converting from AuthenticationResult expiresOn stored as Date
        result.expiresOn
            ? TimeUtils.toSecondsFromDate(result.expiresOn)
            : 0, result.extExpiresOn
            ? TimeUtils.toSecondsFromDate(result.extExpiresOn)
            : 0, base64Decode, undefined, // refreshOn
        result.tokenType, undefined, // userAssertionHash
        request.sshKid, request.claims, claimsHash);
        const cacheRecord = {
            idToken: idTokenEntity,
            accessToken: accessTokenEntity,
        };
        return this.saveCacheRecord(cacheRecord, result.correlationId, AuthToken.isKmsi(AuthToken.extractTokenClaims(result.idToken, base64Decode)));
    }
    /**
     * saves a cache record
     * @param cacheRecord {CacheRecord}
     * @param storeInCache {?StoreInCache}
     * @param correlationId {?string} correlation id
     */
    async saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache) {
        try {
            await super.saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache);
        }
        catch (e) {
            if (e instanceof CacheError &&
                this.performanceClient &&
                correlationId) {
                try {
                    const tokenKeys = this.getTokenKeys();
                    this.performanceClient.addFields({
                        cacheRtCount: tokenKeys.refreshToken.length,
                        cacheIdCount: tokenKeys.idToken.length,
                        cacheAtCount: tokenKeys.accessToken.length,
                    }, correlationId);
                }
                catch (e) { }
            }
            throw e;
        }
    }
}
/**
 * Returns a window storage class implementing the IWindowStorage interface that corresponds to the configured cacheLocation.
 * @param cacheLocation
 */
function getStorageImplementation(clientId, cacheLocation, logger, performanceClient) {
    try {
        switch (cacheLocation) {
            case BrowserCacheLocation.LocalStorage:
                return new LocalStorage(clientId, logger, performanceClient);
            case BrowserCacheLocation.SessionStorage:
                return new SessionStorage();
            case BrowserCacheLocation.MemoryStorage:
            default:
                break;
        }
    }
    catch (e) {
        logger.error(e);
    }
    return new MemoryStorage();
}
const DEFAULT_BROWSER_CACHE_MANAGER = (clientId, logger, performanceClient, eventHandler) => {
    const cacheOptions = {
        cacheLocation: BrowserCacheLocation.MemoryStorage,
        cacheRetentionDays: 5,
        temporaryCacheLocation: BrowserCacheLocation.MemoryStorage,
        storeAuthStateInCookie: false,
        secureCookies: false,
        cacheMigrationEnabled: false,
        claimsBasedCachingEnabled: false,
    };
    return new BrowserCacheManager(clientId, cacheOptions, DEFAULT_CRYPTO_IMPLEMENTATION, logger, performanceClient, eventHandler);
};

export { BrowserCacheManager, DEFAULT_BROWSER_CACHE_MANAGER };
//# sourceMappingURL=BrowserCacheManager.mjs.map
