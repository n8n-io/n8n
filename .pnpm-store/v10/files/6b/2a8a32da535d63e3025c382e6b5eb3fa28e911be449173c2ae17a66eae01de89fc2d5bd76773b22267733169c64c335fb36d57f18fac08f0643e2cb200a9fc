import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AzureDeveloperCliCredentialOptions } from "./azureDeveloperCliCredentialOptions.js";
/**
 * Messages to use when throwing in this credential.
 * @internal
 */
export declare const azureDeveloperCliPublicErrorMessages: {
    notInstalled: string;
    login: string;
    unknown: string;
    claim: string;
};
/**
 * Mockable reference to the Developer CLI credential cliCredentialFunctions
 * @internal
 */
export declare const developerCliCredentialInternals: {
    /**
     * @internal
     */
    getSafeWorkingDir(): string;
    /**
     * Gets the access token from Azure Developer CLI
     * @param scopes - The scopes to use when getting the token
     * @internal
     */
    getAzdAccessToken(scopes: string[], tenantId?: string, timeout?: number, claims?: string): Promise<{
        stdout: string;
        stderr: string;
        error: Error | null;
    }>;
};
/**
 * Azure Developer CLI is a command-line interface tool that allows developers to create, manage, and deploy
 * resources in Azure. It's built on top of the Azure CLI and provides additional functionality specific
 * to Azure developers. It allows users to authenticate as a user and/or a service principal against
 * <a href="https://learn.microsoft.com/entra/fundamentals/">Microsoft Entra ID</a>. The
 * AzureDeveloperCliCredential authenticates in a development environment and acquires a token on behalf of
 * the logged-in user or service principal in the Azure Developer CLI. It acts as the Azure Developer CLI logged in user or
 * service principal and executes an Azure CLI command underneath to authenticate the application against
 * Microsoft Entra ID.
 *
 * <h2> Configure AzureDeveloperCliCredential </h2>
 *
 * To use this credential, the developer needs to authenticate locally in Azure Developer CLI using one of the
 * commands below:
 *
 * <ol>
 *     <li>Run "azd auth login" in Azure Developer CLI to authenticate interactively as a user.</li>
 *     <li>Run "azd auth login --client-id clientID --client-secret clientSecret
 *     --tenant-id tenantID" to authenticate as a service principal.</li>
 * </ol>
 *
 * You may need to repeat this process after a certain time period, depending on the refresh token validity in your
 * organization. Generally, the refresh token validity period is a few weeks to a few months.
 * AzureDeveloperCliCredential will prompt you to sign in again.
 */
export declare class AzureDeveloperCliCredential implements TokenCredential {
    private tenantId?;
    private additionallyAllowedTenantIds;
    private timeout?;
    /**
     * Creates an instance of the {@link AzureDeveloperCliCredential}.
     *
     * To use this credential, ensure that you have already logged
     * in via the 'azd' tool using the command "azd auth login" from the commandline.
     *
     * @param options - Options, to optionally allow multi-tenant requests.
     */
    constructor(options?: AzureDeveloperCliCredentialOptions);
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
//# sourceMappingURL=azureDeveloperCliCredential.d.ts.map