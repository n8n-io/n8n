import { TokenKeys, AccountEntity, IdTokenEntity, AccessTokenEntity, RefreshTokenEntity, AppMetadataEntity, ServerTelemetryEntity, ThrottlingEntity, CacheManager, Logger, ValidCacheType, ICrypto, AuthorityMetadataEntity, ValidCredentialType, StaticAuthorityOptions, CredentialEntity, AccountInfo } from "@azure/msal-common/node";
import { InMemoryCache, JsonCache, CacheKVStore } from "./serializer/SerializerTypes.js";
/**
 * This class implements Storage for node, reading cache from user specified storage location or an  extension library
 * @public
 */
export declare class NodeStorage extends CacheManager {
    private logger;
    private cache;
    private changeEmitters;
    constructor(logger: Logger, clientId: string, cryptoImpl: ICrypto, staticAuthorityOptions?: StaticAuthorityOptions);
    /**
     * Queue up callbacks
     * @param func - a callback function for cache change indication
     */
    registerChangeEmitter(func: () => void): void;
    /**
     * Invoke the callback when cache changes
     */
    emitChange(): void;
    /**
     * Converts cacheKVStore to InMemoryCache
     * @param cache - key value store
     */
    cacheToInMemoryCache(cache: CacheKVStore): InMemoryCache;
    /**
     * converts inMemoryCache to CacheKVStore
     * @param inMemoryCache - kvstore map for inmemory
     */
    inMemoryCacheToCache(inMemoryCache: InMemoryCache): CacheKVStore;
    /**
     * gets the current in memory cache for the client
     */
    getInMemoryCache(): InMemoryCache;
    /**
     * sets the current in memory cache for the client
     * @param inMemoryCache - key value map in memory
     */
    setInMemoryCache(inMemoryCache: InMemoryCache): void;
    /**
     * get the current cache key-value store
     */
    getCache(): CacheKVStore;
    /**
     * sets the current cache (key value store)
     * @param cacheMap - key value map
     */
    setCache(cache: CacheKVStore): void;
    /**
     * Gets cache item with given key.
     * @param key - lookup key for the cache entry
     */
    getItem(key: string): ValidCacheType;
    /**
     * Gets cache item with given key-value
     * @param key - lookup key for the cache entry
     * @param value - value of the cache entry
     */
    setItem(key: string, value: ValidCacheType): void;
    generateCredentialKey(credential: CredentialEntity): string;
    generateAccountKey(account: AccountInfo): string;
    getAccountKeys(): string[];
    getTokenKeys(): TokenKeys;
    /**
     * Reads account from cache, builds it into an account entity and returns it.
     * @param accountKey - lookup key to fetch cache type AccountEntity
     * @returns
     */
    getAccount(accountKey: string): AccountEntity | null;
    /**
     * set account entity
     * @param account - cache value to be set of type AccountEntity
     */
    setAccount(account: AccountEntity): Promise<void>;
    /**
     * fetch the idToken credential
     * @param idTokenKey - lookup key to fetch cache type IdTokenEntity
     */
    getIdTokenCredential(idTokenKey: string): IdTokenEntity | null;
    /**
     * set idToken credential
     * @param idToken - cache value to be set of type IdTokenEntity
     */
    setIdTokenCredential(idToken: IdTokenEntity): Promise<void>;
    /**
     * fetch the accessToken credential
     * @param accessTokenKey - lookup key to fetch cache type AccessTokenEntity
     */
    getAccessTokenCredential(accessTokenKey: string): AccessTokenEntity | null;
    /**
     * set accessToken credential
     * @param accessToken -  cache value to be set of type AccessTokenEntity
     */
    setAccessTokenCredential(accessToken: AccessTokenEntity): Promise<void>;
    /**
     * fetch the refreshToken credential
     * @param refreshTokenKey - lookup key to fetch cache type RefreshTokenEntity
     */
    getRefreshTokenCredential(refreshTokenKey: string): RefreshTokenEntity | null;
    /**
     * set refreshToken credential
     * @param refreshToken - cache value to be set of type RefreshTokenEntity
     */
    setRefreshTokenCredential(refreshToken: RefreshTokenEntity): Promise<void>;
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey - lookup key to fetch cache type AppMetadataEntity
     */
    getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata - cache value to be set of type AppMetadataEntity
     */
    setAppMetadata(appMetadata: AppMetadataEntity): void;
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetrykey - lookup key to fetch cache type ServerTelemetryEntity
     */
    getServerTelemetry(serverTelemetrykey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey - lookup key to fetch cache type ServerTelemetryEntity
     * @param serverTelemetry - cache value to be set of type ServerTelemetryEntity
     */
    setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity): void;
    /**
     * fetch authority metadata entity from the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     */
    getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     * Get all authority metadata keys
     */
    getAuthorityMetadataKeys(): Array<string>;
    /**
     * set authority metadata entity to the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     * @param metadata - cache value to be set of type AuthorityMetadataEntity
     */
    setAuthorityMetadata(key: string, metadata: AuthorityMetadataEntity): void;
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     */
    getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     * @param throttlingCache - cache value to be set of type ThrottlingEntity
     */
    setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity): void;
    /**
     * Removes the cache item from memory with the given key.
     * @param key - lookup key to remove a cache entity
     * @param inMemory - key value map of the cache
     */
    removeItem(key: string): boolean;
    /**
     * Remove account entity from the platform cache if it's outdated
     * @param accountKey - lookup key to fetch cache type AccountEntity
     */
    removeOutdatedAccount(accountKey: string): void;
    /**
     * Checks whether key is in cache.
     * @param key - look up key for a cache entity
     */
    containsKey(key: string): boolean;
    /**
     * Gets all keys in window.
     */
    getKeys(): string[];
    /**
     * Clears all cache entries created by MSAL (except tokens).
     */
    clear(): void;
    /**
     * Initialize in memory cache from an exisiting cache vault
     * @param cache - blob formatted cache (JSON)
     */
    static generateInMemoryCache(cache: string): InMemoryCache;
    /**
     * retrieves the final JSON
     * @param inMemoryCache - itemised cache read from the JSON
     */
    static generateJsonCache(inMemoryCache: InMemoryCache): JsonCache;
    /**
     * Updates a credential's cache key if the current cache key is outdated
     */
    updateCredentialCacheKey(currentCacheKey: string, credential: ValidCredentialType): string;
}
//# sourceMappingURL=NodeStorage.d.ts.map