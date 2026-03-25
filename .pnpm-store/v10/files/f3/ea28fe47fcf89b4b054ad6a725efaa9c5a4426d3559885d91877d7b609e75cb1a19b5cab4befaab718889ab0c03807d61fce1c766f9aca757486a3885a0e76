import { Logger, ICrypto, AccountEntity, ScopeSet, IPerformanceClient, TokenClaims, InProgressPerformanceEvent } from "@azure/msal-common/browser";
import { BaseInteractionClient } from "./BaseInteractionClient.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { SilentRequest } from "../request/SilentRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { ApiId, CacheLookupPolicy } from "../utils/BrowserConstants.js";
import { PlatformAuthRequest } from "../broker/nativeBroker/PlatformAuthRequest.js";
import { MATS, PlatformAuthResponse } from "../broker/nativeBroker/PlatformAuthResponse.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { SilentCacheClient } from "./SilentCacheClient.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export declare class PlatformAuthInteractionClient extends BaseInteractionClient {
    protected apiId: ApiId;
    protected accountId: string;
    protected platformAuthProvider: IPlatformAuthHandler;
    protected silentCacheClient: SilentCacheClient;
    protected nativeStorageManager: BrowserCacheManager;
    protected skus: string;
    constructor(config: BrowserConfiguration, browserStorage: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, apiId: ApiId, performanceClient: IPerformanceClient, provider: IPlatformAuthHandler, accountId: string, nativeStorageImpl: BrowserCacheManager, correlationId?: string);
    /**
     * Adds SKUs to request extra query parameters
     * @param request {PlatformAuthRequest}
     * @private
     */
    private addRequestSKUs;
    /**
     * Acquire token from native platform via browser extension
     * @param request
     */
    acquireToken(request: PopupRequest | SilentRequest | SsoSilentRequest, cacheLookupPolicy?: CacheLookupPolicy): Promise<AuthenticationResult>;
    /**
     * Creates silent flow request
     * @param request
     * @param cachedAccount
     * @returns CommonSilentFlowRequest
     */
    private createSilentCacheRequest;
    /**
     * Fetches the tokens from the cache if un-expired
     * @param nativeAccountId
     * @param request
     * @returns authenticationResult
     */
    protected acquireTokensFromCache(nativeAccountId: string, request: PlatformAuthRequest): Promise<AuthenticationResult>;
    /**
     * Acquires a token from native platform then redirects to the redirectUri instead of returning the response
     * @param {RedirectRequest} request
     * @param {InProgressPerformanceEvent} rootMeasurement
     */
    acquireTokenRedirect(request: RedirectRequest, rootMeasurement: InProgressPerformanceEvent): Promise<void>;
    /**
     * If the previous page called native platform for a token using redirect APIs, send the same request again and return the response
     * @param performanceClient {IPerformanceClient?}
     * @param correlationId {string?} correlation identifier
     */
    handleRedirectPromise(performanceClient?: IPerformanceClient, correlationId?: string): Promise<AuthenticationResult | null>;
    /**
     * Logout from native platform via browser extension
     * @param request
     */
    logout(): Promise<void>;
    /**
     * Transform response from native platform into AuthenticationResult object which will be returned to the end user
     * @param response
     * @param request
     * @param reqTimestamp
     */
    protected handleNativeResponse(response: PlatformAuthResponse, request: PlatformAuthRequest, reqTimestamp: number): Promise<AuthenticationResult>;
    /**
     * creates an homeAccountIdentifier for the account
     * @param response
     * @param idTokenObj
     * @returns
     */
    protected createHomeAccountIdentifier(response: PlatformAuthResponse, idTokenClaims: TokenClaims): string;
    /**
     * Helper to generate scopes
     * @param response
     * @param request
     * @returns
     */
    generateScopes(requestScopes: string, responseScopes?: string): ScopeSet;
    /**
     * If PoP token is requesred, records the PoP token if returned from the WAM, else generates one in the browser
     * @param request
     * @param response
     */
    generatePopAccessToken(response: PlatformAuthResponse, request: PlatformAuthRequest): Promise<string>;
    /**
     * Generates authentication result
     * @param response
     * @param request
     * @param idTokenObj
     * @param accountEntity
     * @param authority
     * @param reqTimestamp
     * @returns
     */
    protected generateAuthenticationResult(response: PlatformAuthResponse, request: PlatformAuthRequest, idTokenClaims: TokenClaims, accountEntity: AccountEntity, authority: string, reqTimestamp: number): Promise<AuthenticationResult>;
    /**
     * cache the account entity in browser storage
     * @param accountEntity
     */
    cacheAccount(accountEntity: AccountEntity, correlationId: string, kmsi: boolean): Promise<void>;
    /**
     * Stores the access_token and id_token in inmemory storage
     * @param response
     * @param request
     * @param homeAccountIdentifier
     * @param idTokenObj
     * @param responseAccessToken
     * @param tenantId
     * @param reqTimestamp
     */
    cacheNativeTokens(response: PlatformAuthResponse, request: PlatformAuthRequest, homeAccountIdentifier: string, idTokenClaims: TokenClaims, responseAccessToken: string, tenantId: string, reqTimestamp: number): Promise<void>;
    getExpiresInValue(tokenType: string, expiresIn: string | number | undefined): number;
    protected addTelemetryFromNativeResponse(matsResponse?: string): MATS | null;
    /**
     * Gets MATS telemetry from native response
     * @param response
     * @returns
     */
    private getMATSFromResponse;
    /**
     * Returns whether or not response came from native cache
     * @param response
     * @returns
     */
    protected isResponseFromCache(mats: MATS): boolean;
    /**
     * Translates developer provided request object into NativeRequest object
     * @param request
     */
    protected initializeNativeRequest(request: PopupRequest | SsoSilentRequest): Promise<PlatformAuthRequest>;
    private getCanonicalAuthority;
    private getPrompt;
    /**
     * Handles extra broker request parameters
     * @param request {PlatformAuthRequest}
     * @private
     */
    private handleExtraBrokerParams;
}
//# sourceMappingURL=PlatformAuthInteractionClient.d.ts.map