import { AccessTokenEntity, AccountEntity, AccountInfo, AppMetadataEntity, AuthorityMetadataEntity, CacheManager, CacheRecord, CommonAuthorizationUrlRequest, ICrypto, IdTokenEntity, IPerformanceClient, Logger, RefreshTokenEntity, ServerTelemetryEntity, StaticAuthorityOptions, StoreInCache, ThrottlingEntity, TokenKeys, CredentialEntity } from "@azure/msal-common/browser";
import { CacheOptions } from "../config/Configuration.js";
import { INTERACTION_TYPE } from "../utils/BrowserConstants.js";
import { MemoryStorage } from "./MemoryStorage.js";
import { IWindowStorage } from "./IWindowStorage.js";
import { PlatformAuthRequest } from "../broker/nativeBroker/PlatformAuthRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { CookieStorage } from "./CookieStorage.js";
import { EventHandler } from "../event/EventHandler.js";
import { EncryptedData } from "./EncryptedData.js";
type KmsiMap = {
    [homeAccountId: string]: boolean;
};
/**
 * This class implements the cache storage interface for MSAL through browser local or session storage.
 * Cookies are only used if storeAuthStateInCookie is true, and are only used for
 * parameters such as state and nonce, generally.
 */
export declare class BrowserCacheManager extends CacheManager {
    protected cacheConfig: Required<CacheOptions>;
    protected browserStorage: IWindowStorage<string>;
    protected internalStorage: MemoryStorage<string>;
    protected temporaryCacheStorage: IWindowStorage<string>;
    protected cookieStorage: CookieStorage;
    protected logger: Logger;
    private eventHandler;
    constructor(clientId: string, cacheConfig: Required<CacheOptions>, cryptoImpl: ICrypto, logger: Logger, performanceClient: IPerformanceClient, eventHandler: EventHandler, staticAuthorityOptions?: StaticAuthorityOptions);
    initialize(correlationId: string): Promise<void>;
    /**
     * Migrates any existing cache data from previous versions of MSAL.js into the current cache structure.
     */
    migrateExistingCache(correlationId: string): Promise<void>;
    /**
     * Parses entry, adds lastUpdatedAt if it doesn't exist, removes entry if expired or invalid
     * @param key
     * @param correlationId
     * @returns
     */
    updateOldEntry(key: string, correlationId: string): Promise<CredentialEntity | null>;
    /**
     * Remove accounts from the cache for older schema versions if they have not been updated in the last cacheRetentionDays
     * @param accountSchema
     * @param credentialSchema
     * @param correlationId
     * @returns
     */
    removeStaleAccounts(accountSchema: number, credentialSchema: number, correlationId: string): Promise<void>;
    /**
     * Remove the given account and all associated tokens from the cache
     * @param accountKey
     * @param rawObject
     * @param credentialSchema
     * @param correlationId
     */
    removeAccountOldSchema(accountKey: string, rawObject: AccountEntity | EncryptedData, credentialSchema: number, correlationId: string): Promise<void>;
    /**
     * Gets key value pair mapping homeAccountId to KMSI value
     * @returns
     */
    getKMSIValues(): KmsiMap;
    /**
     * Migrates id tokens from the old schema to the new schema, also migrates associated account object if it doesn't already exist in the new schema
     * @param credentialSchema
     * @param accountSchema
     * @param correlationId
     * @returns
     */
    migrateIdTokens(credentialSchema: number, accountSchema: number, correlationId: string): Promise<void>;
    /**
     * Migrates access tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    migrateAccessTokens(credentialSchema: number, kmsiMap: KmsiMap, correlationId: string): Promise<void>;
    /**
     * Migrates refresh tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    migrateRefreshTokens(credentialSchema: number, kmsiMap: KmsiMap, correlationId: string): Promise<void>;
    /**
     * Tracks upgrades and downgrades for telemetry and debugging purposes
     */
    private trackVersionChanges;
    /**
     * Parses passed value as JSON object, JSON.parse() will throw an error.
     * @param input
     */
    protected validateAndParseJson(jsonValue: string): object | null;
    /**
     * Helper to setItem in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     */
    setItem(key: string, value: string, correlationId: string): void;
    /**
     * Helper to setUserData in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     * @param correlationId
     */
    setUserData(key: string, value: string, correlationId: string, timestamp: string, kmsi: boolean): Promise<void>;
    /**
     * Reads account from cache, deserializes it into an account entity and returns it.
     * If account is not found from the key, returns null and removes key from map.
     * @param accountKey
     * @returns
     */
    getAccount(accountKey: string, correlationId: string): AccountEntity | null;
    /**
     * set account entity in the platform cache
     * @param account
     */
    setAccount(account: AccountEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * Returns the array of account keys currently cached
     * @returns
     */
    getAccountKeys(): Array<string>;
    setAccountKeys(accountKeys: Array<string>, correlationId: string, schemaVersion?: number): void;
    /**
     * Add a new account to the key map
     * @param key
     */
    addAccountKeyToMap(key: string, correlationId: string): boolean;
    /**
     * Remove an account from the key map
     * @param key
     */
    removeAccountKeyFromMap(key: string, correlationId: string): void;
    /**
     * Extends inherited removeAccount function to include removal of the account key from the map
     * @param key
     */
    removeAccount(account: AccountInfo, correlationId: string): void;
    /**
     * Removes given idToken from the cache and from the key map
     * @param key
     */
    removeIdToken(key: string, correlationId: string): void;
    /**
     * Removes given accessToken from the cache and from the key map
     * @param key
     */
    removeAccessToken(key: string, correlationId: string, updateTokenKeys?: boolean): void;
    /**
     * Remove access token key from the key map
     * @param key
     * @param correlationId
     * @param tokenKeys
     */
    removeAccessTokenKeys(keys: Array<string>, correlationId: string, schemaVersion?: number): void;
    /**
     * Removes given refreshToken from the cache and from the key map
     * @param key
     */
    removeRefreshToken(key: string, correlationId: string): void;
    /**
     * Gets the keys for the cached tokens associated with this clientId
     * @returns
     */
    getTokenKeys(schemaVersion?: number): TokenKeys;
    /**
     * Stores the token keys in the cache
     * @param tokenKeys
     * @param correlationId
     * @returns
     */
    setTokenKeys(tokenKeys: TokenKeys, correlationId: string, schemaVersion?: number): void;
    /**
     * generates idToken entity from a string
     * @param idTokenKey
     */
    getIdTokenCredential(idTokenKey: string, correlationId: string): IdTokenEntity | null;
    /**
     * set IdToken credential to the platform cache
     * @param idToken
     */
    setIdTokenCredential(idToken: IdTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * generates accessToken entity from a string
     * @param key
     */
    getAccessTokenCredential(accessTokenKey: string, correlationId: string): AccessTokenEntity | null;
    /**
     * set accessToken credential to the platform cache
     * @param accessToken
     */
    setAccessTokenCredential(accessToken: AccessTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * generates refreshToken entity from a string
     * @param refreshTokenKey
     */
    getRefreshTokenCredential(refreshTokenKey: string, correlationId: string): RefreshTokenEntity | null;
    /**
     * set refreshToken credential to the platform cache
     * @param refreshToken
     */
    setRefreshTokenCredential(refreshToken: RefreshTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
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
    getServerTelemetry(serverTelemetryKey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity, correlationId: string): void;
    /**
     *
     */
    getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     *
     */
    getAuthorityMetadataKeys(): Array<string>;
    /**
     * Sets wrapper metadata in memory
     * @param wrapperSKU
     * @param wrapperVersion
     */
    setWrapperMetadata(wrapperSKU: string, wrapperVersion: string): void;
    /**
     * Returns wrapper metadata from in-memory storage
     */
    getWrapperMetadata(): [string, string];
    /**
     *
     * @param entity
     */
    setAuthorityMetadata(key: string, entity: AuthorityMetadataEntity): void;
    /**
     * Gets the active account
     */
    getActiveAccount(correlationId: string): AccountInfo | null;
    /**
     * Sets the active account's localAccountId in cache
     * @param account
     */
    setActiveAccount(account: AccountInfo | null, correlationId: string): void;
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
    setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity, correlationId: string): void;
    /**
     * Gets cache item with given key.
     * Will retrieve from cookies if storeAuthStateInCookie is set to true.
     * @param key
     */
    getTemporaryCache(cacheKey: string, generateKey?: boolean): string | null;
    /**
     * Sets the cache item with the key and value given.
     * Stores in cookie if storeAuthStateInCookie is set to true.
     * This can cause cookie overflow if used incorrectly.
     * @param key
     * @param value
     */
    setTemporaryCache(cacheKey: string, value: string, generateKey?: boolean): void;
    /**
     * Removes the cache item with the given key.
     * @param key
     */
    removeItem(key: string): void;
    /**
     * Removes the temporary cache item with the given key.
     * Will also clear the cookie item if storeAuthStateInCookie is set to true.
     * @param key
     */
    removeTemporaryItem(key: string): void;
    /**
     * Gets all keys in window.
     */
    getKeys(): string[];
    /**
     * Clears all cache entries created by MSAL.
     */
    clear(correlationId: string): void;
    /**
     * Clears all access tokes that have claims prior to saving the current one
     * @param performanceClient {IPerformanceClient}
     * @param correlationId {string} correlation id
     * @returns
     */
    clearTokensAndKeysWithClaims(correlationId: string): void;
    /**
     * Prepend msal.<client-id> to each key
     * @param key
     * @param addInstanceId
     */
    generateCacheKey(key: string): string;
    /**
     * Cache Key: msal.<schema_version>-<home_account_id>-<environment>-<credential_type>-<client_id or familyId>-<realm>-<scopes>-<claims hash>-<scheme>
     * IdToken Example: uid.utid-login.microsoftonline.com-idtoken-app_client_id-contoso.com
     * AccessToken Example: uid.utid-login.microsoftonline.com-accesstoken-app_client_id-contoso.com-scope1 scope2--pop
     * RefreshToken Example: uid.utid-login.microsoftonline.com-refreshtoken-1-contoso.com
     * @param credentialEntity
     * @returns
     */
    generateCredentialKey(credential: CredentialEntity): string;
    /**
     * Cache Key: msal.<schema_version>.<home_account_id>.<environment>.<tenant_id>
     * @param account
     * @returns
     */
    generateAccountKey(account: AccountInfo): string;
    /**
     * Reset all temporary cache items
     * @param state
     */
    resetRequestCache(): void;
    cacheAuthorizeRequest(authCodeRequest: CommonAuthorizationUrlRequest, codeVerifier?: string): void;
    /**
     * Gets the token exchange parameters from the cache. Throws an error if nothing is found.
     */
    getCachedRequest(): [CommonAuthorizationUrlRequest, string];
    /**
     * Gets cached native request for redirect flows
     */
    getCachedNativeRequest(): PlatformAuthRequest | null;
    isInteractionInProgress(matchClientId?: boolean): boolean;
    getInteractionInProgress(): {
        clientId: string;
        type: INTERACTION_TYPE;
    } | null;
    setInteractionInProgress(inProgress: boolean, type?: INTERACTION_TYPE): void;
    /**
     * Builds credential entities from AuthenticationResult object and saves the resulting credentials to the cache
     * @param result
     * @param request
     */
    hydrateCache(result: AuthenticationResult, request: SilentRequest | SsoSilentRequest | RedirectRequest | PopupRequest): Promise<void>;
    /**
     * saves a cache record
     * @param cacheRecord {CacheRecord}
     * @param storeInCache {?StoreInCache}
     * @param correlationId {?string} correlation id
     */
    saveCacheRecord(cacheRecord: CacheRecord, correlationId: string, kmsi: boolean, storeInCache?: StoreInCache): Promise<void>;
}
export declare const DEFAULT_BROWSER_CACHE_MANAGER: (clientId: string, logger: Logger, performanceClient: IPerformanceClient, eventHandler: EventHandler) => BrowserCacheManager;
export {};
//# sourceMappingURL=BrowserCacheManager.d.ts.map