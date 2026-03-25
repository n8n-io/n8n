import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { OnBehalfOfCredentialAssertionOptions, OnBehalfOfCredentialCertificateOptions, OnBehalfOfCredentialSecretOptions } from "./onBehalfOfCredentialOptions.js";
import type { CredentialPersistenceOptions } from "./credentialPersistenceOptions.js";
import type { MultiTenantTokenCredentialOptions } from "./multiTenantTokenCredentialOptions.js";
/**
 * Enables authentication to Microsoft Entra ID using the [On Behalf Of flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-on-behalf-of-flow).
 */
export declare class OnBehalfOfCredential implements TokenCredential {
    private tenantId;
    private additionallyAllowedTenantIds;
    private msalClient;
    private sendCertificateChain?;
    private certificatePath?;
    private clientSecret?;
    private userAssertionToken;
    private clientAssertion?;
    /**
     * Creates an instance of the {@link OnBehalfOfCredential} with the details
     * needed to authenticate against Microsoft Entra ID with path to a PEM certificate,
     * and an user assertion.
     *
     * Example using the `KeyClient` from [\@azure/keyvault-keys](https://www.npmjs.com/package/\@azure/keyvault-keys):
     *
     * ```ts snippet:on_behalf_of_credential_pem_example
     * import { OnBehalfOfCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const tokenCredential = new OnBehalfOfCredential({
     *   tenantId: "tenant-id",
     *   clientId: "client-id",
     *   certificatePath: "/path/to/certificate.pem",
     *   userAssertionToken: "access-token",
     * });
     * const client = new KeyClient("vault-url", tokenCredential);
     *
     * await client.getKey("key-name");
     * ```
     *
     * @param options - Optional parameters, generally common across credentials.
     */
    constructor(options: OnBehalfOfCredentialCertificateOptions & MultiTenantTokenCredentialOptions & CredentialPersistenceOptions);
    /**
     * Creates an instance of the {@link OnBehalfOfCredential} with the details
     * needed to authenticate against Microsoft Entra ID with a client
     * secret and an user assertion.
     *
     * Example using the `KeyClient` from [\@azure/keyvault-keys](https://www.npmjs.com/package/\@azure/keyvault-keys):
     *
     * ```ts snippet:on_behalf_of_credential_secret_example
     * import { OnBehalfOfCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const tokenCredential = new OnBehalfOfCredential({
     *   tenantId: "tenant-id",
     *   clientId: "client-id",
     *   clientSecret: "client-secret",
     *   userAssertionToken: "access-token",
     * });
     * const client = new KeyClient("vault-url", tokenCredential);
     *
     * await client.getKey("key-name");
     * ```
     *
     * @param options - Optional parameters, generally common across credentials.
     */
    constructor(options: OnBehalfOfCredentialSecretOptions & MultiTenantTokenCredentialOptions & CredentialPersistenceOptions);
    /**
     * Creates an instance of the {@link OnBehalfOfCredential} with the details
     * needed to authenticate against Microsoft Entra ID with a client `getAssertion`
     * and an user assertion.
     *
     * Example using the `KeyClient` from [\@azure/keyvault-keys](https://www.npmjs.com/package/\@azure/keyvault-keys):
     *
     * ```ts snippet:on_behalf_of_credential_assertion_example
     * import { OnBehalfOfCredential } from "@azure/identity";
     * import { KeyClient } from "@azure/keyvault-keys";
     *
     * const tokenCredential = new OnBehalfOfCredential({
     *   tenantId: "tenant-id",
     *   clientId: "client-id",
     *   getAssertion: () => {
     *     return Promise.resolve("my-jwt");
     *   },
     *   userAssertionToken: "access-token",
     * });
     * const client = new KeyClient("vault-url", tokenCredential);
     *
     * await client.getKey("key-name");
     * ```
     *
     * @param options - Optional parameters, generally common across credentials.
     */
    constructor(options: OnBehalfOfCredentialAssertionOptions & MultiTenantTokenCredentialOptions & CredentialPersistenceOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure the underlying network requests.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    private buildClientCertificate;
    private parseCertificate;
}
//# sourceMappingURL=onBehalfOfCredential.d.ts.map