import { Logger, IPerformanceClient, ServerResponseType, Authority, CommonAuthorizationUrlRequest } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
/**
 * Creates a hidden iframe to given URL using user-requested scopes as an id.
 * @param urlNavigate
 * @param userRequestScopes
 */
export declare function initiateCodeRequest(requestUrl: string, performanceClient: IPerformanceClient, logger: Logger, correlationId: string, navigateFrameWait?: number): Promise<HTMLIFrameElement>;
export declare function initiateCodeFlowWithPost(config: BrowserConfiguration, authority: Authority, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient: IPerformanceClient): Promise<HTMLIFrameElement>;
export declare function initiateEarRequest(config: BrowserConfiguration, authority: Authority, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient: IPerformanceClient): Promise<HTMLIFrameElement>;
/**
 * Monitors an iframe content window until it loads a url with a known hash, or hits a specified timeout.
 * @param iframe
 * @param timeout
 */
export declare function monitorIframeForHash(iframe: HTMLIFrameElement, timeout: number, pollIntervalMilliseconds: number, performanceClient: IPerformanceClient, logger: Logger, correlationId: string, responseType: ServerResponseType): Promise<string>;
//# sourceMappingURL=SilentHandler.d.ts.map