import { ICrypto, Logger, IPerformanceClient } from "@azure/msal-common/browser";
import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { ApiId } from "../utils/BrowserConstants.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";
export declare class SilentAuthCodeClient extends StandardInteractionClient {
    private apiId;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, apiId: ApiId, performanceClient: IPerformanceClient, platformAuthProvider?: IPlatformAuthHandler, correlationId?: string);
    /**
     * Acquires a token silently by redeeming an authorization code against the /token endpoint
     * @param request
     */
    acquireToken(request: AuthorizationCodeRequest): Promise<AuthenticationResult>;
    /**
     * Currently Unsupported
     */
    logout(): Promise<void>;
}
//# sourceMappingURL=SilentAuthCodeClient.d.ts.map