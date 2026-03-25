import { AccountCache, IdTokenCache, AccessTokenCache, RefreshTokenCache, AppMetadataCache } from "@azure/msal-common/node";
import { JsonCache, InMemoryCache, SerializedAccountEntity, SerializedIdTokenEntity, SerializedAccessTokenEntity, SerializedRefreshTokenEntity, SerializedAppMetadataEntity } from "./SerializerTypes.js";
/**
 * This class deserializes cache entities read from the file into in-memory object types defined internally
 * @internal
 */
export declare class Deserializer {
    /**
     * Parse the JSON blob in memory and deserialize the content
     * @param cachedJson - JSON blob cache
     */
    static deserializeJSONBlob(jsonFile: string): JsonCache;
    /**
     * Deserializes accounts to AccountEntity objects
     * @param accounts - accounts of type SerializedAccountEntity
     */
    static deserializeAccounts(accounts: Record<string, SerializedAccountEntity>): AccountCache;
    /**
     * Deserializes id tokens to IdTokenEntity objects
     * @param idTokens - credentials of type SerializedIdTokenEntity
     */
    static deserializeIdTokens(idTokens: Record<string, SerializedIdTokenEntity>): IdTokenCache;
    /**
     * Deserializes access tokens to AccessTokenEntity objects
     * @param accessTokens - access tokens of type SerializedAccessTokenEntity
     */
    static deserializeAccessTokens(accessTokens: Record<string, SerializedAccessTokenEntity>): AccessTokenCache;
    /**
     * Deserializes refresh tokens to RefreshTokenEntity objects
     * @param refreshTokens - refresh tokens of type SerializedRefreshTokenEntity
     */
    static deserializeRefreshTokens(refreshTokens: Record<string, SerializedRefreshTokenEntity>): RefreshTokenCache;
    /**
     * Deserializes appMetadata to AppMetaData objects
     * @param appMetadata - app metadata of type SerializedAppMetadataEntity
     */
    static deserializeAppMetadata(appMetadata: Record<string, SerializedAppMetadataEntity>): AppMetadataCache;
    /**
     * Deserialize an inMemory Cache
     * @param jsonCache - JSON blob cache
     */
    static deserializeAllCache(jsonCache: JsonCache): InMemoryCache;
}
//# sourceMappingURL=Deserializer.d.ts.map