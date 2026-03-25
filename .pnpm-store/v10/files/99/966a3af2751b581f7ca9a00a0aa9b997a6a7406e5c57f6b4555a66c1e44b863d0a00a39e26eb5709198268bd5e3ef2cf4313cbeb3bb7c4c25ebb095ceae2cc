import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { ClientAssertionCredentialOptions } from "./clientAssertionCredentialOptions.js";
/**
 * Authenticates a service principal with a JWT assertion.
 */
export declare class ClientAssertionCredential implements TokenCredential {
    private msalClient;
    private tenantId;
    private additionallyAllowedTenantIds;
    private getAssertion;
    private options;
    /**
     * Creates an instance of the ClientAssertionCredential with the details
     * needed to authenticate against Microsoft Entra ID with a client
     * assertion provided by the developer through the `getAssertion` function parameter.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param getAssertion - A function that retrieves the assertion for the credential to use.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, getAssertion: () => Promise<string>, options?: ClientAssertionCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
}
//# sourceMappingURL=clientAssertionCredential.d.ts.map