import { Authority, INetworkModule, Logger } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../../config/Configuration.js";
import { BrowserCacheManager } from "../../cache/BrowserCacheManager.js";
/**
 * Authority class which can be used to create an authority object for Custom Auth features.
 */
export declare class CustomAuthAuthority extends Authority {
    private customAuthProxyDomain?;
    /**
     * Constructor for the Custom Auth Authority.
     * @param authority - The authority URL for the authority.
     * @param networkInterface - The network interface implementation to make requests.
     * @param cacheManager - The cache manager.
     * @param authorityOptions - The options for the authority.
     * @param logger - The logger for the authority.
     * @param customAuthProxyDomain - The custom auth proxy domain.
     */
    constructor(authority: string, config: BrowserConfiguration, networkInterface: INetworkModule, cacheManager: BrowserCacheManager, logger: Logger, customAuthProxyDomain?: string | undefined);
    /**
     * Gets the custom auth endpoint.
     * The open id configuration doesn't have the correct endpoint for the auth APIs.
     * We need to generate the endpoint manually based on the authority URL.
     * @returns The custom auth endpoint
     */
    getCustomAuthApiDomain(): string;
    getPreferredCache(): string;
    get tokenEndpoint(): string;
}
//# sourceMappingURL=CustomAuthAuthority.d.ts.map