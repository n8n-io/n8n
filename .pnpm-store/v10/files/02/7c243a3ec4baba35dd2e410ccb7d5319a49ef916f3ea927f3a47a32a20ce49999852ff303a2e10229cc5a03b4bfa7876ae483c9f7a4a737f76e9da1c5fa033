import { ICrypto, INetworkModule, Logger, AccountInfo, ServerTelemetryManager, Authority, IPerformanceClient, AzureCloudOptions, StringDict } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export declare abstract class BaseInteractionClient {
    protected config: BrowserConfiguration;
    protected browserStorage: BrowserCacheManager;
    protected browserCrypto: ICrypto;
    protected networkClient: INetworkModule;
    protected logger: Logger;
    protected eventHandler: EventHandler;
    protected navigationClient: INavigationClient;
    protected platformAuthProvider: IPlatformAuthHandler | undefined;
    protected correlationId: string;
    protected performanceClient: IPerformanceClient;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, platformAuthProvider?: IPlatformAuthHandler, correlationId?: string);
    abstract acquireToken(request: RedirectRequest | PopupRequest | SsoSilentRequest): Promise<AuthenticationResult | void>;
    abstract logout(request: EndSessionRequest | ClearCacheRequest | undefined): Promise<void>;
    protected clearCacheOnLogout(correlationId: string, account?: AccountInfo | null): Promise<void>;
    /**
     *
     * Use to get the redirect uri configured in MSAL or null.
     * @param requestRedirectUri
     * @returns Redirect URL
     *
     */
    getRedirectUri(requestRedirectUri?: string): string;
    /**
     *
     * @param apiId
     * @param correlationId
     * @param forceRefresh
     */
    protected initializeServerTelemetryManager(apiId: number, forceRefresh?: boolean): ServerTelemetryManager;
    /**
     * Used to get a discovered version of the default authority.
     * @param params {
     *         requestAuthority?: string;
     *         requestAzureCloudOptions?: AzureCloudOptions;
     *         requestExtraQueryParameters?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    protected getDiscoveredAuthority(params: {
        requestAuthority?: string;
        requestAzureCloudOptions?: AzureCloudOptions;
        requestExtraQueryParameters?: StringDict;
        account?: AccountInfo;
    }): Promise<Authority>;
}
//# sourceMappingURL=BaseInteractionClient.d.ts.map