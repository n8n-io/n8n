import { ServerAuthorizationTokenResponse } from "./ServerAuthorizationTokenResponse.js";
import { ICrypto } from "../crypto/ICrypto.js";
import { Logger } from "../logger/Logger.js";
import { AuthenticationResult } from "./AuthenticationResult.js";
import { AccountEntity } from "../cache/entities/AccountEntity.js";
import { Authority } from "../authority/Authority.js";
import { CacheRecord } from "../cache/entities/CacheRecord.js";
import { CacheManager } from "../cache/CacheManager.js";
import { RequestStateObject } from "../utils/ProtocolUtils.js";
import { ICachePlugin } from "../cache/interface/ICachePlugin.js";
import { ISerializableTokenCache } from "../cache/interface/ISerializableTokenCache.js";
import { AuthorizationCodePayload } from "./AuthorizationCodePayload.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { TokenClaims } from "../account/TokenClaims.js";
/**
 * Class that handles response parsing.
 * @internal
 */
export declare class ResponseHandler {
    private clientId;
    private cacheStorage;
    private cryptoObj;
    private logger;
    private homeAccountIdentifier;
    private serializableCache;
    private persistencePlugin;
    private performanceClient?;
    constructor(clientId: string, cacheStorage: CacheManager, cryptoObj: ICrypto, logger: Logger, serializableCache: ISerializableTokenCache | null, persistencePlugin: ICachePlugin | null, performanceClient?: IPerformanceClient);
    /**
     * Function which validates server authorization token response.
     * @param serverResponse
     * @param refreshAccessToken
     */
    validateTokenResponse(serverResponse: ServerAuthorizationTokenResponse, refreshAccessToken?: boolean): void;
    /**
     * Returns a constructed token response based on given string. Also manages the cache updates and cleanups.
     * @param serverTokenResponse
     * @param authority
     */
    handleServerTokenResponse(serverTokenResponse: ServerAuthorizationTokenResponse, authority: Authority, reqTimestamp: number, request: BaseAuthRequest, authCodePayload?: AuthorizationCodePayload, userAssertionHash?: string, handlingRefreshTokenResponse?: boolean, forceCacheRefreshTokenResponse?: boolean, serverRequestId?: string): Promise<AuthenticationResult>;
    /**
     * Generates CacheRecord
     * @param serverTokenResponse
     * @param idTokenObj
     * @param authority
     */
    private generateCacheRecord;
    /**
     * Creates an @AuthenticationResult from @CacheRecord , @IdToken , and a boolean that states whether or not the result is from cache.
     *
     * Optionally takes a state string that is set as-is in the response.
     *
     * @param cacheRecord
     * @param idTokenObj
     * @param fromTokenCache
     * @param stateString
     */
    static generateAuthenticationResult(cryptoObj: ICrypto, authority: Authority, cacheRecord: CacheRecord, fromTokenCache: boolean, request: BaseAuthRequest, idTokenClaims?: TokenClaims, requestState?: RequestStateObject, serverTokenResponse?: ServerAuthorizationTokenResponse, requestId?: string): Promise<AuthenticationResult>;
}
export declare function buildAccountToCache(cacheStorage: CacheManager, authority: Authority, homeAccountId: string, base64Decode: (input: string) => string, correlationId: string, idTokenClaims?: TokenClaims, clientInfo?: string, environment?: string, claimsTenantId?: string | null, authCodePayload?: AuthorizationCodePayload, nativeAccountId?: string, logger?: Logger): AccountEntity;
//# sourceMappingURL=ResponseHandler.d.ts.map