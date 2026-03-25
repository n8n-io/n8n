import { ICrypto, Logger, ExternalTokenResponse } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import type { SilentRequest } from "../request/SilentRequest.js";
import { BrowserCacheManager } from "./BrowserCacheManager.js";
import type { ITokenCache } from "./ITokenCache.js";
import type { AuthenticationResult } from "../response/AuthenticationResult.js";
export type LoadTokenOptions = {
    clientInfo?: string;
    expiresOn?: number;
    extendedExpiresOn?: number;
};
/**
 * Token cache manager
 */
export declare class TokenCache implements ITokenCache {
    isBrowserEnvironment: boolean;
    protected config: BrowserConfiguration;
    private storage;
    private logger;
    private cryptoObj;
    constructor(configuration: BrowserConfiguration, storage: BrowserCacheManager, logger: Logger, cryptoObj: ICrypto);
    /**
     * API to load tokens to msal-browser cache.
     * @param request
     * @param response
     * @param options
     * @returns `AuthenticationResult` for the response that was loaded.
     */
    loadExternalTokens(request: SilentRequest, response: ExternalTokenResponse, options: LoadTokenOptions): Promise<AuthenticationResult>;
    /**
     * Helper function to load account to msal-browser cache
     * @param idToken
     * @param environment
     * @param clientInfo
     * @param authorityType
     * @param requestHomeAccountId
     * @returns `AccountEntity`
     */
    private loadAccount;
    /**
     * Helper function to load id tokens to msal-browser cache
     * @param idToken
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `IdTokenEntity`
     */
    private loadIdToken;
    /**
     * Helper function to load access tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `AccessTokenEntity`
     */
    private loadAccessToken;
    /**
     * Helper function to load refresh tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @returns `RefreshTokenEntity`
     */
    private loadRefreshToken;
    /**
     * Helper function to generate an `AuthenticationResult` for the result.
     * @param request
     * @param idTokenObj
     * @param cacheRecord
     * @param authority
     * @returns `AuthenticationResult`
     */
    private generateAuthenticationResult;
}
//# sourceMappingURL=TokenCache.d.ts.map