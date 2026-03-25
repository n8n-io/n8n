import type { DefaultAzureCredentialClientIdOptions, DefaultAzureCredentialOptions, DefaultAzureCredentialResourceIdOptions } from "./defaultAzureCredentialOptions.js";
import { ChainedTokenCredential } from "./chainedTokenCredential.js";
import type { TokenCredential } from "@azure/core-auth";
/**
 * A no-op credential that logs the reason it was skipped if getToken is called.
 * @internal
 */
export declare class UnavailableDefaultCredential implements TokenCredential {
    credentialUnavailableErrorMessage: string;
    credentialName: string;
    constructor(credentialName: string, message: string);
    getToken(): Promise<null>;
}
/**
 * Provides a default {@link ChainedTokenCredential} configuration that works for most
 * applications that use Azure SDK client libraries. For more information, see
 * [DefaultAzureCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-defaultazurecredential-for-flexibility).
 *
 * The following credential types will be tried, in order:
 *
 * - {@link EnvironmentCredential}
 * - {@link WorkloadIdentityCredential}
 * - {@link ManagedIdentityCredential}
 * - {@link VisualStudioCodeCredential}
 * - {@link AzureCliCredential}
 * - {@link AzurePowerShellCredential}
 * - {@link AzureDeveloperCliCredential}
 * - BrokerCredential (a broker-enabled credential that requires \@azure/identity-broker is installed)
 *
 * Consult the documentation of these credential types for more information
 * on how they attempt authentication.
 *
 * The following example demonstrates how to use the `requiredEnvVars` option to ensure that certain environment variables are set before the `DefaultAzureCredential` is instantiated.
 * If any of the specified environment variables are missing or empty, an error will be thrown, preventing the application from continuing execution without the necessary configuration.
 * It also demonstrates how to set the `AZURE_TOKEN_CREDENTIALS` environment variable to control which credentials are included in the chain.
 
 * ```ts snippet:defaultazurecredential_requiredEnvVars
 * import { DefaultAzureCredential } from "@azure/identity";
 *
 * const credential = new DefaultAzureCredential({
 *   requiredEnvVars: [
 *     "AZURE_CLIENT_ID",
 *     "AZURE_TENANT_ID",
 *     "AZURE_CLIENT_SECRET",
 *     "AZURE_TOKEN_CREDENTIALS",
 *   ],
 * });
 * ```
 */
export declare class DefaultAzureCredential extends ChainedTokenCredential {
    /**
     * Creates an instance of the DefaultAzureCredential class with {@link DefaultAzureCredentialClientIdOptions}.
     *
     * @param options - Optional parameters. See {@link DefaultAzureCredentialClientIdOptions}.
     */
    constructor(options?: DefaultAzureCredentialClientIdOptions);
    /**
     * Creates an instance of the DefaultAzureCredential class with {@link DefaultAzureCredentialResourceIdOptions}.
     *
     * @param options - Optional parameters. See {@link DefaultAzureCredentialResourceIdOptions}.
     */
    constructor(options?: DefaultAzureCredentialResourceIdOptions);
    /**
     * Creates an instance of the DefaultAzureCredential class with {@link DefaultAzureCredentialOptions}.
     *
     * @param options - Optional parameters. See {@link DefaultAzureCredentialOptions}.
     */
    constructor(options?: DefaultAzureCredentialOptions);
}
//# sourceMappingURL=defaultAzureCredential.d.ts.map