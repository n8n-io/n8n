import { Authority, CommonAuthorizationUrlRequest, IPerformanceClient, Logger, AuthorizationCodeClient, AuthorizeResponse } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import { ApiId } from "../utils/BrowserConstants.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
/**
 * Gets the full /authorize URL with request parameters when using Auth Code + PKCE
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
export declare function getAuthCodeRequestUrl(config: BrowserConfiguration, authority: Authority, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient: IPerformanceClient): Promise<string>;
/**
 * Gets the form that will be posted to /authorize with request parameters when using EAR
 */
export declare function getEARForm(frame: Document, config: BrowserConfiguration, authority: Authority, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient: IPerformanceClient): Promise<HTMLFormElement>;
/**
 * Gets the form that will be posted to /authorize with request parameters when using POST method
 */
export declare function getCodeForm(frame: Document, config: BrowserConfiguration, authority: Authority, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient: IPerformanceClient): Promise<HTMLFormElement>;
/**
 * Response handler when server returns accountId on the /authorize request
 * @param request
 * @param accountId
 * @param apiId
 * @param config
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
export declare function handleResponsePlatformBroker(request: CommonAuthorizationUrlRequest, accountId: string, apiId: ApiId, config: BrowserConfiguration, browserStorage: BrowserCacheManager, nativeStorage: BrowserCacheManager, eventHandler: EventHandler, logger: Logger, performanceClient: IPerformanceClient, platformAuthProvider?: IPlatformAuthHandler): Promise<AuthenticationResult>;
/**
 * Response handler when server returns code on the /authorize request
 * @param request
 * @param response
 * @param codeVerifier
 * @param authClient
 * @param browserStorage
 * @param logger
 * @param performanceClient
 * @returns
 */
export declare function handleResponseCode(request: CommonAuthorizationUrlRequest, response: AuthorizeResponse, codeVerifier: string, apiId: ApiId, config: BrowserConfiguration, authClient: AuthorizationCodeClient, browserStorage: BrowserCacheManager, nativeStorage: BrowserCacheManager, eventHandler: EventHandler, logger: Logger, performanceClient: IPerformanceClient, platformAuthProvider?: IPlatformAuthHandler): Promise<AuthenticationResult>;
/**
 * Response handler when server returns ear_jwe on the /authorize request
 * @param request
 * @param response
 * @param apiId
 * @param config
 * @param authority
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
export declare function handleResponseEAR(request: CommonAuthorizationUrlRequest, response: AuthorizeResponse, apiId: ApiId, config: BrowserConfiguration, authority: Authority, browserStorage: BrowserCacheManager, nativeStorage: BrowserCacheManager, eventHandler: EventHandler, logger: Logger, performanceClient: IPerformanceClient, platformAuthProvider?: IPlatformAuthHandler): Promise<AuthenticationResult>;
//# sourceMappingURL=Authorize.d.ts.map