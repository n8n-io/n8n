import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AzurePowerShellCredentialOptions } from "./azurePowerShellCredentialOptions.js";
/**
 * Returns a platform-appropriate command name by appending ".exe" on Windows.
 *
 * @internal
 */
export declare function formatCommand(commandName: string): string;
/**
 * Known PowerShell errors
 * @internal
 */
export declare const powerShellErrors: {
    login: string;
    installed: string;
};
/**
 * Messages to use when throwing in this credential.
 * @internal
 */
export declare const powerShellPublicErrorMessages: {
    login: string;
    installed: string;
    claim: string;
    troubleshoot: string;
};
/**
 * The PowerShell commands to be tried, in order.
 *
 * @internal
 */
export declare const commandStack: string[];
/**
 * This credential will use the currently logged-in user information from the
 * Azure PowerShell module. To do so, it will read the user access token and
 * expire time with Azure PowerShell command `Get-AzAccessToken -ResourceUrl {ResourceScope}`
 */
export declare class AzurePowerShellCredential implements TokenCredential {
    private tenantId?;
    private additionallyAllowedTenantIds;
    private timeout?;
    /**
     * Creates an instance of the {@link AzurePowerShellCredential}.
     *
     * To use this credential:
     * - Install the Azure Az PowerShell module with:
     *   `Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force`.
     * - You have already logged in to Azure PowerShell using the command
     * `Connect-AzAccount` from the command line.
     *
     * @param options - Options, to optionally allow multi-tenant requests.
     */
    constructor(options?: AzurePowerShellCredentialOptions);
    /**
     * Gets the access token from Azure PowerShell
     * @param resource - The resource to use when getting the token
     */
    private getAzurePowerShellAccessToken;
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If the authentication cannot be performed through PowerShell, a {@link CredentialUnavailableError} will be thrown.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
}
/**
 *
 * @internal
 */
export declare function parseJsonToken(result: string): Promise<{
    Token: string;
    ExpiresOn: string;
}>;
//# sourceMappingURL=azurePowerShellCredential.d.ts.map