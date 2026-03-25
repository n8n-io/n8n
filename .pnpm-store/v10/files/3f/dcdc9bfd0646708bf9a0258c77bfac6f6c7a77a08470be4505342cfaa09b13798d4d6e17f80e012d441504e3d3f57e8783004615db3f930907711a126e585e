import { ICustomAuthApiClient } from "../network_client/custom_auth_api/ICustomAuthApiClient.js";
import { CustomAuthAuthority } from "../CustomAuthAuthority.js";
import { CustomAuthInteractionClientBase } from "./CustomAuthInteractionClientBase.js";
import { BrowserConfiguration } from "../../../config/Configuration.js";
import { BrowserCacheManager } from "../../../cache/BrowserCacheManager.js";
import { ICrypto, IPerformanceClient, Logger } from "@azure/msal-common/browser";
import { EventHandler } from "../../../event/EventHandler.js";
import { INavigationClient } from "../../../navigation/INavigationClient.js";
export declare class CustomAuthInterationClientFactory {
    private config;
    private storageImpl;
    private browserCrypto;
    private logger;
    private eventHandler;
    private navigationClient;
    private performanceClient;
    private customAuthApiClient;
    private customAuthAuthority;
    constructor(config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, customAuthApiClient: ICustomAuthApiClient, customAuthAuthority: CustomAuthAuthority);
    create<TClient extends CustomAuthInteractionClientBase>(clientConstructor: new (config: BrowserConfiguration, storageImpl: BrowserCacheManager, browserCrypto: ICrypto, logger: Logger, eventHandler: EventHandler, navigationClient: INavigationClient, performanceClient: IPerformanceClient, customAuthApiClient: ICustomAuthApiClient, customAuthAuthority: CustomAuthAuthority) => TClient): TClient;
}
//# sourceMappingURL=CustomAuthInterationClientFactory.d.ts.map