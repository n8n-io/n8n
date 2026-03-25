import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AzureCliCredentialOptions } from "./azureCliCredentialOptions.js";
/**
 * Messages to use when throwing in this credential.
 * @internal
 */
export declare const azureCliPublicErrorMessages: {
    claim: string;
    notInstalled: string;
    login: string;
    unknown: string;
    unexpectedResponse: string;
};
/**
 * Mockable reference to the CLI credential cliCredentialFunctions
 * @internal
 */
export declare const cliCredentialInternals: {
    /**
     * @internal
     */
    getSafeWorkingDir(): string;
    /**
     * Gets the access token from Azure CLI
     * @param resource - The resource to use when getting the token
     * @internal
     */
    getAzureCliAccessToken(resource: string, tenantId?: string, subscription?: string, timeout?: number): Promise<{
        stdout: string;
        stderr: string;
        error: Error | null;
    }>;
};
/**
 * This credential will use the currently logged-in user login information
 * via the Azure CLI ('az') commandline tool.
 * To do so, it will read the user access token and expire time
 * with Azure CLI command "az account get-access-token".
 */
export declare class AzureCliCredential implements TokenCredential {
    private tenantId?;
    private additionallyAllowedTenantIds;
    private timeout?;
    private subscription?;
    /**
     * Creates an instance of the {@link AzureCliCredential}.
     *
     * To use this credential, ensure that you have already logged
     * in via the 'az' tool using the command "az login" from the commandline.
     *
     * @param options - Options, to optionally allow multi-tenant requests.
     */
    constructor(options?: AzureCliCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Parses the raw JSON response from the Azure CLI into a usable AccessToken object
     *
     * @param rawResponse - The raw JSON response from the Azure CLI
     * @returns An access token with the expiry time parsed from the raw response
     *
     * The expiryTime of the credential's access token, in milliseconds, is calculated as follows:
     *
     * When available, expires_on (introduced in Azure CLI v2.54.0) will be preferred. Otherwise falls back to expiresOn.
     */
    private parseRawResponse;
}
//# sourceMappingURL=azureCliCredential.d.ts.map