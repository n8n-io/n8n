import { AccountCache, IdTokenCache, AccessTokenCache, RefreshTokenCache, AppMetadataCache } from "@azure/msal-common/node";
import { InMemoryCache, JsonCache, SerializedAccountEntity, SerializedIdTokenEntity, SerializedAccessTokenEntity, SerializedRefreshTokenEntity, SerializedAppMetadataEntity } from "./SerializerTypes.js";
/**
 * This class serializes cache entities to be saved into in-memory object types defined internally
 * @internal
 */
export declare class Serializer {
    /**
     * serialize the JSON blob
     * @param data - JSON blob cache
     */
    static serializeJSONBlob(data: JsonCache): string;
    /**
     * Serialize Accounts
     * @param accCache - cache of accounts
     */
    static serializeAccounts(accCache: AccountCache): Record<string, SerializedAccountEntity>;
    /**
     * Serialize IdTokens
     * @param idTCache - cache of ID tokens
     */
    static serializeIdTokens(idTCache: IdTokenCache): Record<string, SerializedIdTokenEntity>;
    /**
     * Serializes AccessTokens
     * @param atCache - cache of access tokens
     */
    static serializeAccessTokens(atCache: AccessTokenCache): Record<string, SerializedAccessTokenEntity>;
    /**
     * Serialize refreshTokens
     * @param rtCache - cache of refresh tokens
     */
    static serializeRefreshTokens(rtCache: RefreshTokenCache): Record<string, SerializedRefreshTokenEntity>;
    /**
     * Serialize amdtCache
     * @param amdtCache - cache of app metadata
     */
    static serializeAppMetadata(amdtCache: AppMetadataCache): Record<string, SerializedAppMetadataEntity>;
    /**
     * Serialize the cache
     * @param inMemCache - itemised cache read from the JSON
     */
    static serializeAllCache(inMemCache: InMemoryCache): JsonCache;
}
//# sourceMappingURL=Serializer.d.ts.map