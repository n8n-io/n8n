import { AuthorizationCodeClient, CommonEndSessionRequest, IPerformanceClient, Logger, ICrypto, PkceCodes, CommonAuthorizationUrlRequest } from "@azure/msal-common/browser";
import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { EndSessionPopupRequest } from "../request/EndSessionPopupRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { EventHandler } from "../event/EventHandler.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { PopupWindowAttributes } from "../request/PopupWindowAttributes.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export type PopupParams = {
    popup?: Window | null;
    popupName: string;
    popupWindowAttributes: PopupWindowAttributes;
    popupWindowParent: Window;
};
export declare class PopupClient extends StandardInteractionClient {
    private currentWindow;
    protected nativeStorage: BrowserCacheManager;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, nativeStorageImpl: BrowserCacheManager, platformAuthHandler?: IPlatformAuthHandler, correlationId?: string);
    /**
     * Acquires tokens by opening a popup window to the /authorize endpoint of the authority
     * @param request
     * @param pkceCodes
     */
    acquireToken(request: PopupRequest, pkceCodes?: PkceCodes): Promise<AuthenticationResult>;
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logout(logoutRequest?: EndSessionPopupRequest): Promise<void>;
    /**
     * Helper which obtains an access_token for your API via opening a popup window in the user's browser
     * @param request
     * @param popupParams
     * @param pkceCodes
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    protected acquireTokenPopupAsync(request: PopupRequest, popupParams: PopupParams, pkceCodes?: PkceCodes): Promise<AuthenticationResult>;
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @param popupParams
     * @param pkceCodes
     * @returns
     */
    executeCodeFlow(request: CommonAuthorizationUrlRequest, popupParams: PopupParams, pkceCodes?: PkceCodes): Promise<AuthenticationResult>;
    /**
     * Executes EAR flow
     * @param request
     */
    executeEarFlow(request: CommonAuthorizationUrlRequest, popupParams: PopupParams, pkceCodes?: PkceCodes): Promise<AuthenticationResult>;
    executeCodeFlowWithPost(request: CommonAuthorizationUrlRequest, popupParams: PopupParams, authClient: AuthorizationCodeClient, pkceVerifier: string): Promise<AuthenticationResult>;
    /**
     *
     * @param validRequest
     * @param popupName
     * @param requestAuthority
     * @param popup
     * @param mainWindowRedirectUri
     * @param popupWindowAttributes
     */
    protected logoutPopupAsync(validRequest: CommonEndSessionRequest, popupParams: PopupParams, requestAuthority?: string, mainWindowRedirectUri?: string): Promise<void>;
    /**
     * Opens a popup window with given request Url.
     * @param requestUrl
     */
    initiateAuthRequest(requestUrl: string, params: PopupParams): Window;
    /**
     * Monitors a window until it loads a url with the same origin.
     * @param popupWindow - window that is being monitored
     * @param timeout - timeout for processing hash once popup is redirected back to application
     */
    monitorPopupForHash(popupWindow: Window, popupWindowParent: Window): Promise<string>;
    /**
     * @hidden
     *
     * Configures popup window for login.
     *
     * @param urlNavigate
     * @param title
     * @param popUpWidth
     * @param popUpHeight
     * @param popupWindowAttributes
     * @ignore
     * @hidden
     */
    openPopup(urlNavigate: string, popupParams: PopupParams): Window;
    /**
     * Helper function to set popup window dimensions and position
     * @param urlNavigate
     * @param popupName
     * @param popupWindowAttributes
     * @returns
     */
    openSizedPopup(urlNavigate: string, { popupName, popupWindowAttributes, popupWindowParent }: PopupParams): Window | null;
    /**
     * Event callback to unload main window.
     */
    unloadWindow(e: Event): void;
    /**
     * Closes popup, removes any state vars created during popup calls.
     * @param popupWindow
     */
    cleanPopup(popupWindow: Window, popupWindowParent: Window): void;
    /**
     * Generates the name for the popup based on the client id and request
     * @param clientId
     * @param request
     */
    generatePopupName(scopes: Array<string>, authority: string): string;
    /**
     * Generates the name for the popup based on the client id and request for logouts
     * @param clientId
     * @param request
     */
    generateLogoutPopupName(request: CommonEndSessionRequest): string;
}
//# sourceMappingURL=PopupClient.d.ts.map