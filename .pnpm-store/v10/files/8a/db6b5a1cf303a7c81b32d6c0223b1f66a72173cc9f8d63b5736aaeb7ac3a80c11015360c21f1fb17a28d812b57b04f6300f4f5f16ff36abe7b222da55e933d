import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import { TokenCredentialOptions } from "../tokenCredentialOptions.js";
import { MultiTenantTokenCredentialOptions } from "./multiTenantTokenCredentialOptions.js";
/**
 * Enables authentication to Microsoft Entra ID using WAM (Web Account Manager) broker.
 * This credential uses the default account logged into the OS via a broker.
 */
export declare class BrokerCredential implements TokenCredential {
    private brokerMsalClient;
    private brokerTenantId?;
    private brokerAdditionallyAllowedTenantIds;
    /**
     * Creates an instance of BrokerCredential with the required broker options.
     *
     * This credential uses WAM (Web Account Manager) for authentication, which provides
     * better security and user experience on Windows platforms.
     *
     * @param options - Options for configuring the broker credential, including required broker options.
     */
    constructor(options: {
        tenantId?: string;
    } & TokenCredentialOptions & MultiTenantTokenCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID using WAM broker and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * This method extends the base getToken method to support silentAuthenticationOnly option
     * when using broker authentication.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure the token request, including silentAuthenticationOnly option.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
}
//# sourceMappingURL=brokerCredential.d.ts.map