import { NetworkResponse } from "./NetworkResponse.js";
import { ServerAuthorizationTokenResponse } from "../response/ServerAuthorizationTokenResponse.js";
import { CacheManager } from "../cache/CacheManager.js";
import { RequestThumbprint } from "./RequestThumbprint.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
/** @internal */
export declare class ThrottlingUtils {
    /**
     * Prepares a RequestThumbprint to be stored as a key.
     * @param thumbprint
     */
    static generateThrottlingStorageKey(thumbprint: RequestThumbprint): string;
    /**
     * Performs necessary throttling checks before a network request.
     * @param cacheManager
     * @param thumbprint
     */
    static preProcess(cacheManager: CacheManager, thumbprint: RequestThumbprint, correlationId: string): void;
    /**
     * Performs necessary throttling checks after a network request.
     * @param cacheManager
     * @param thumbprint
     * @param response
     */
    static postProcess(cacheManager: CacheManager, thumbprint: RequestThumbprint, response: NetworkResponse<ServerAuthorizationTokenResponse>, correlationId: string): void;
    /**
     * Checks a NetworkResponse object's status codes against 429 or 5xx
     * @param response
     */
    static checkResponseStatus(response: NetworkResponse<ServerAuthorizationTokenResponse>): boolean;
    /**
     * Checks a NetworkResponse object's RetryAfter header
     * @param response
     */
    static checkResponseForRetryAfter(response: NetworkResponse<ServerAuthorizationTokenResponse>): boolean;
    /**
     * Calculates the Unix-time value for a throttle to expire given throttleTime in seconds.
     * @param throttleTime
     */
    static calculateThrottleTime(throttleTime: number): number;
    static removeThrottle(cacheManager: CacheManager, clientId: string, request: BaseAuthRequest, homeAccountIdentifier?: string): void;
}
//# sourceMappingURL=ThrottlingUtils.d.ts.map