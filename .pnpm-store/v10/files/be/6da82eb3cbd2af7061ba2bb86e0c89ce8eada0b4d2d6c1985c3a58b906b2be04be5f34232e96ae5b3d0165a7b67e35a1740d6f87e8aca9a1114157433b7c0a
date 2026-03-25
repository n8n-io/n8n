import { AccountFilter, CredentialFilter, ValidCredentialType, AppMetadataFilter, AppMetadataCache, TokenKeys } from "./utils/CacheTypes.js";
import { CacheRecord } from "./entities/CacheRecord.js";
import { CredentialEntity } from "./entities/CredentialEntity.js";
import { AccountEntity } from "./entities/AccountEntity.js";
import { AccessTokenEntity } from "./entities/AccessTokenEntity.js";
import { IdTokenEntity } from "./entities/IdTokenEntity.js";
import { RefreshTokenEntity } from "./entities/RefreshTokenEntity.js";
import { ICacheManager } from "./interface/ICacheManager.js";
import { AccountInfo } from "../account/AccountInfo.js";
import { AppMetadataEntity } from "./entities/AppMetadataEntity.js";
import { ServerTelemetryEntity } from "./entities/ServerTelemetryEntity.js";
import { ThrottlingEntity } from "./entities/ThrottlingEntity.js";
import { ICrypto } from "../crypto/ICrypto.js";
import { AuthorityMetadataEntity } from "./entities/AuthorityMetadataEntity.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
import { Logger } from "../logger/Logger.js";
import { StoreInCache } from "../request/StoreInCache.js";
import { StaticAuthorityOptions } from "../authority/AuthorityOptions.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
/**
 * Interface class which implement cache storage functions used by MSAL to perform validity checks, and store tokens.
 * @internal
 */
export declare abstract class CacheManager implements ICacheManager {
    protected clientId: string;
    protected cryptoImpl: ICrypto;
    private commonLogger;
    private staticAuthorityOptions?;
    protected performanceClient: IPerformanceClient;
    constructor(clientId: string, cryptoImpl: ICrypto, logger: Logger, performanceClient: IPerformanceClient, staticAuthorityOptions?: StaticAuthorityOptions);
    /**
     * fetch the account entity from the platform cache
     *  @param accountKey
     */
    abstract getAccount(accountKey: string, correlationId: string): AccountEntity | null;
    /**
     * set account entity in the platform cache
     * @param account
     * @param correlationId
     */
    abstract setAccount(account: AccountEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * fetch the idToken entity from the platform cache
     * @param idTokenKey
     */
    abstract getIdTokenCredential(idTokenKey: string, correlationId: string): IdTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param idToken
     * @param correlationId
     */
    abstract setIdTokenCredential(idToken: IdTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * fetch the idToken entity from the platform cache
     * @param accessTokenKey
     */
    abstract getAccessTokenCredential(accessTokenKey: string, correlationId: string): AccessTokenEntity | null;
    /**
     * set accessToken entity to the platform cache
     * @param accessToken
     * @param correlationId
     */
    abstract setAccessTokenCredential(accessToken: AccessTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * fetch the idToken entity from the platform cache
     * @param refreshTokenKey
     */
    abstract getRefreshTokenCredential(refreshTokenKey: string, correlationId: string): RefreshTokenEntity | null;
    /**
     * set refreshToken entity to the platform cache
     * @param refreshToken
     * @param correlationId
     */
    abstract setRefreshTokenCredential(refreshToken: RefreshTokenEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    abstract getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    abstract setAppMetadata(appMetadata: AppMetadataEntity, correlationId: string): void;
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    abstract getServerTelemetry(serverTelemetryKey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    abstract setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity, correlationId: string): void;
    /**
     * fetch cloud discovery metadata entity from the platform cache
     * @param key
     */
    abstract getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     *
     */
    abstract getAuthorityMetadataKeys(): Array<string>;
    /**
     * set cloud discovery metadata entity to the platform cache
     * @param key
     * @param value
     */
    abstract setAuthorityMetadata(key: string, value: AuthorityMetadataEntity): void;
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    abstract getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    abstract setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity, correlationId: string): void;
    /**
     * Function to remove an item from cache given its key.
     * @param key
     */
    abstract removeItem(key: string, correlationId: string): void;
    /**
     * Function which retrieves all current keys from the cache.
     */
    abstract getKeys(): string[];
    /**
     * Function which retrieves all account keys from the cache
     */
    abstract getAccountKeys(): string[];
    /**
     * Function which retrieves all token keys from the cache
     */
    abstract getTokenKeys(): TokenKeys;
    /**
     * Returns credential cache key from the entity
     * @param credential
     */
    abstract generateCredentialKey(credential: CredentialEntity): string;
    /**
     * Returns the account cache key from the account info
     * @param account
     */
    abstract generateAccountKey(account: AccountInfo): string;
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter: AccountFilter, correlationId: string): AccountInfo[];
    /**
     * Gets first tenanted AccountInfo object found based on provided filters
     */
    getAccountInfoFilteredBy(accountFilter: AccountFilter, correlationId: string): AccountInfo | null;
    /**
     * Returns a single matching
     * @param accountFilter
     * @returns
     */
    getBaseAccountInfo(accountFilter: AccountFilter, correlationId: string): AccountInfo | null;
    /**
     * Matches filtered account entities with cached ID tokens that match the tenant profile-specific account filters
     * and builds the account info objects from the matching ID token's claims
     * @param cachedAccounts
     * @param accountFilter
     * @returns Array of AccountInfo objects that match account and tenant profile filters
     */
    private buildTenantProfiles;
    private getTenantedAccountInfoByFilter;
    private getTenantProfilesFromAccountEntity;
    private tenantProfileMatchesFilter;
    private idTokenClaimsMatchTenantProfileFilter;
    /**
     * saves a cache record
     * @param cacheRecord {CacheRecord}
     * @param correlationId {?string} correlation id
     * @param kmsi - Keep Me Signed In
     * @param storeInCache {?StoreInCache}
     */
    saveCacheRecord(cacheRecord: CacheRecord, correlationId: string, kmsi: boolean, storeInCache?: StoreInCache): Promise<void>;
    /**
     * saves access token credential
     * @param credential
     */
    private saveAccessToken;
    /**
     * Retrieve account entities matching all provided tenant-agnostic filters; if no filter is set, get all account entities in the cache
     * Not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
     * @param accountFilter - An object containing Account properties to filter by
     */
    getAccountsFilteredBy(accountFilter: AccountFilter, correlationId: string): AccountEntity[];
    /**
     * Returns whether or not the given credential entity matches the filter
     * @param entity
     * @param filter
     * @returns
     */
    credentialMatchesFilter(entity: ValidCredentialType, filter: CredentialFilter): boolean;
    /**
     * retrieve appMetadata matching all provided filters; if no filter is set, get all appMetadata
     * @param filter
     */
    getAppMetadataFilteredBy(filter: AppMetadataFilter): AppMetadataCache;
    /**
     * retrieve authorityMetadata that contains a matching alias
     * @param filter
     */
    getAuthorityMetadataByAlias(host: string): AuthorityMetadataEntity | null;
    /**
     * Removes all accounts and related tokens from cache.
     */
    removeAllAccounts(correlationId: string): void;
    /**
     * Removes the account and related tokens for a given account key
     * @param account
     */
    removeAccount(account: AccountInfo, correlationId: string): void;
    /**
     * Removes credentials associated with the provided account
     * @param account
     */
    removeAccountContext(account: AccountInfo, correlationId: string): void;
    /**
     * Removes accessToken from the cache
     * @param key
     * @param correlationId
     */
    removeAccessToken(key: string, correlationId: string): void;
    /**
     * Removes all app metadata objects from cache.
     */
    removeAppMetadata(correlationId: string): boolean;
    /**
     * Retrieve IdTokenEntity from cache
     * @param account {AccountInfo}
     * @param tokenKeys {?TokenKeys}
     * @param targetRealm {?string}
     * @param performanceClient {?IPerformanceClient}
     * @param correlationId {?string}
     */
    getIdToken(account: AccountInfo, correlationId: string, tokenKeys?: TokenKeys, targetRealm?: string, performanceClient?: IPerformanceClient): IdTokenEntity | null;
    /**
     * Gets all idTokens matching the given filter
     * @param filter
     * @returns
     */
    getIdTokensByFilter(filter: CredentialFilter, correlationId: string, tokenKeys?: TokenKeys): Map<string, IdTokenEntity>;
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     * @returns
     */
    idTokenKeyMatchesFilter(inputKey: string, filter: CredentialFilter): boolean;
    /**
     * Removes idToken from the cache
     * @param key
     */
    removeIdToken(key: string, correlationId: string): void;
    /**
     * Removes refresh token from the cache
     * @param key
     */
    removeRefreshToken(key: string, correlationId: string): void;
    /**
     * Retrieve AccessTokenEntity from cache
     * @param account {AccountInfo}
     * @param request {BaseAuthRequest}
     * @param correlationId {?string}
     * @param tokenKeys {?TokenKeys}
     * @param performanceClient {?IPerformanceClient}
     */
    getAccessToken(account: AccountInfo, request: BaseAuthRequest, tokenKeys?: TokenKeys, targetRealm?: string): AccessTokenEntity | null;
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     * @param keyMustContainAllScopes
     * @returns
     */
    accessTokenKeyMatchesFilter(inputKey: string, filter: CredentialFilter, keyMustContainAllScopes: boolean): boolean;
    /**
     * Gets all access tokens matching the filter
     * @param filter
     * @returns
     */
    getAccessTokensByFilter(filter: CredentialFilter, correlationId: string): AccessTokenEntity[];
    /**
     * Helper to retrieve the appropriate refresh token from cache
     * @param account {AccountInfo}
     * @param familyRT {boolean}
     * @param correlationId {?string}
     * @param tokenKeys {?TokenKeys}
     * @param performanceClient {?IPerformanceClient}
     */
    getRefreshToken(account: AccountInfo, familyRT: boolean, correlationId: string, tokenKeys?: TokenKeys, performanceClient?: IPerformanceClient): RefreshTokenEntity | null;
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     */
    refreshTokenKeyMatchesFilter(inputKey: string, filter: CredentialFilter): boolean;
    /**
     * Retrieve AppMetadataEntity from cache
     */
    readAppMetadataFromCache(environment: string): AppMetadataEntity | null;
    /**
     * Return the family_id value associated  with FOCI
     * @param environment
     * @param clientId
     */
    isAppMetadataFOCI(environment: string): boolean;
    /**
     * helper to match account ids
     * @param value
     * @param homeAccountId
     */
    private matchHomeAccountId;
    /**
     * helper to match account ids
     * @param entity
     * @param localAccountId
     * @returns
     */
    private matchLocalAccountIdFromTokenClaims;
    private matchLocalAccountIdFromTenantProfile;
    /**
     * helper to match names
     * @param entity
     * @param name
     * @returns true if the downcased name properties are present and match in the filter and the entity
     */
    private matchName;
    /**
     * helper to match usernames
     * @param entity
     * @param username
     * @returns
     */
    private matchUsername;
    /**
     * helper to match assertion
     * @param value
     * @param oboAssertion
     */
    private matchUserAssertionHash;
    /**
     * helper to match environment
     * @param value
     * @param environment
     */
    private matchEnvironment;
    /**
     * helper to match credential type
     * @param entity
     * @param credentialType
     */
    private matchCredentialType;
    /**
     * helper to match client ids
     * @param entity
     * @param clientId
     */
    private matchClientId;
    /**
     * helper to match family ids
     * @param entity
     * @param familyId
     */
    private matchFamilyId;
    /**
     * helper to match realm
     * @param entity
     * @param realm
     */
    private matchRealm;
    /**
     * helper to match nativeAccountId
     * @param entity
     * @param nativeAccountId
     * @returns boolean indicating the match result
     */
    private matchNativeAccountId;
    /**
     * helper to match loginHint which can be either:
     * 1. login_hint ID token claim
     * 2. username in cached account object
     * 3. upn in ID token claims
     * @param entity
     * @param loginHint
     * @returns
     */
    private matchLoginHintFromTokenClaims;
    /**
     * Helper to match sid
     * @param entity
     * @param sid
     * @returns true if the sid claim is present and matches the filter
     */
    private matchSid;
    private matchAuthorityType;
    /**
     * Returns true if the target scopes are a subset of the current entity's scopes, false otherwise.
     * @param entity
     * @param target
     */
    private matchTarget;
    /**
     * Returns true if the credential's tokenType or Authentication Scheme matches the one in the request, false otherwise
     * @param entity
     * @param tokenType
     */
    private matchTokenType;
    /**
     * Returns true if the credential's keyId matches the one in the request, false otherwise
     * @param entity
     * @param keyId
     */
    private matchKeyId;
    /**
     * returns if a given cache entity is of the type appmetadata
     * @param key
     */
    private isAppMetadata;
    /**
     * returns if a given cache entity is of the type authoritymetadata
     * @param key
     */
    protected isAuthorityMetadata(key: string): boolean;
    /**
     * returns cache key used for cloud instance metadata
     */
    generateAuthorityMetadataCacheKey(authority: string): string;
    /**
     * Helper to convert serialized data to object
     * @param obj
     * @param json
     */
    static toObject<T>(obj: T, json: object): T;
}
/** @internal */
export declare class DefaultStorageClass extends CacheManager {
    setAccount(): Promise<void>;
    getAccount(): AccountEntity;
    setIdTokenCredential(): Promise<void>;
    getIdTokenCredential(): IdTokenEntity;
    setAccessTokenCredential(): Promise<void>;
    getAccessTokenCredential(): AccessTokenEntity;
    setRefreshTokenCredential(): Promise<void>;
    getRefreshTokenCredential(): RefreshTokenEntity;
    setAppMetadata(): void;
    getAppMetadata(): AppMetadataEntity;
    setServerTelemetry(): void;
    getServerTelemetry(): ServerTelemetryEntity;
    setAuthorityMetadata(): void;
    getAuthorityMetadata(): AuthorityMetadataEntity | null;
    getAuthorityMetadataKeys(): Array<string>;
    setThrottlingCache(): void;
    getThrottlingCache(): ThrottlingEntity;
    removeItem(): boolean;
    getKeys(): string[];
    getAccountKeys(): string[];
    getTokenKeys(): TokenKeys;
    generateCredentialKey(): string;
    generateAccountKey(): string;
}
//# sourceMappingURL=CacheManager.d.ts.map