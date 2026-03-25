import { ServerTelemetryManager, AuthorizeResponse, ICrypto, Logger, IPerformanceClient, InProgressPerformanceEvent, CommonAuthorizationUrlRequest } from "@azure/msal-common/browser";
import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export declare class RedirectClient extends StandardInteractionClient {
    protected nativeStorage: BrowserCacheManager;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, nativeStorageImpl: BrowserCacheManager, platformAuthHandler?: IPlatformAuthHandler, correlationId?: string);
    /**
     * Redirects the page to the /authorize endpoint of the IDP
     * @param request
     */
    acquireToken(request: RedirectRequest): Promise<void>;
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @returns
     */
    executeCodeFlow(request: CommonAuthorizationUrlRequest, onRedirectNavigate?: (url: string) => boolean | void): Promise<void>;
    /**
     * Executes EAR flow
     * @param request
     */
    executeEarFlow(request: CommonAuthorizationUrlRequest): Promise<void>;
    /**
     * Executes classic Authorization Code flow with a POST request.
     * @param request
     */
    executeCodeFlowWithPost(request: CommonAuthorizationUrlRequest): Promise<void>;
    /**
     * Checks if navigateToLoginRequestUrl is set, and:
     * - if true, performs logic to cache and navigate
     * - if false, handles hash string and parses response
     * @param hash {string} url hash
     * @param parentMeasurement {InProgressPerformanceEvent} parent measurement
     */
    handleRedirectPromise(hash: string | undefined, request: CommonAuthorizationUrlRequest, pkceVerifier: string, parentMeasurement: InProgressPerformanceEvent): Promise<AuthenticationResult | null>;
    /**
     * Gets the response hash for a redirect request
     * Returns null if interactionType in the state value is not "redirect" or the hash does not contain known properties
     * @param hash
     */
    protected getRedirectResponse(userProvidedResponse: string): [AuthorizeResponse | null, string];
    /**
     * Checks if hash exists and handles in window.
     * @param hash
     * @param state
     */
    protected handleResponse(serverParams: AuthorizeResponse, request: CommonAuthorizationUrlRequest, codeVerifier: string, serverTelemetryManager: ServerTelemetryManager): Promise<AuthenticationResult>;
    /**
     * Redirects window to given URL.
     * @param urlNavigate
     * @param onRedirectNavigateRequest - onRedirectNavigate callback provided on the request
     */
    initiateAuthRequest(requestUrl: string, onRedirectNavigateRequest?: (url: string) => boolean | void): Promise<void>;
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    logout(logoutRequest?: EndSessionRequest): Promise<void>;
    /**
     * Use to get the redirectStartPage either from request or use current window
     * @param requestStartPage
     */
    protected getRedirectStartPage(requestStartPage?: string): string;
}
//# sourceMappingURL=RedirectClient.d.ts.map