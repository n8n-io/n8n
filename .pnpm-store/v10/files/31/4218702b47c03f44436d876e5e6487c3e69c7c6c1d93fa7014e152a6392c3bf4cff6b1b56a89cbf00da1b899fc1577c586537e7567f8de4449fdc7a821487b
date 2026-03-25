import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { VisualStudioCodeCredentialOptions } from "./visualStudioCodeCredentialOptions.js";
/**
 * Connects to Azure using the user account signed in through the Azure Resources extension in Visual Studio Code.
 * Once the user has logged in via the extension, this credential can share the same refresh token
 * that is cached by the extension.
 */
export declare class VisualStudioCodeCredential implements TokenCredential {
    private tenantId;
    private additionallyAllowedTenantIds;
    private msalClient;
    private options;
    /**
     * Creates an instance of VisualStudioCodeCredential to use for automatically authenticating via VSCode.
     *
     * **Note**: `VisualStudioCodeCredential` is provided by a plugin package:
     * `@azure/identity-vscode`. If this package is not installed, then authentication using
     * `VisualStudioCodeCredential` will not be available.
     *
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(options?: VisualStudioCodeCredentialOptions);
    /**
     * Runs preparations for any further getToken request:
     *   - Validates that the plugin is available.
     *   - Loads the authentication record from VSCode if available.
     *   - Creates the MSAL client with the loaded plugin and authentication record.
     */
    private prepare;
    /**
     * The promise of the single preparation that will be executed at the first getToken request for an instance of this class.
     */
    private preparePromise;
    /**
     * Runs preparations for any further getToken, but only once.
     */
    private prepareOnce;
    /**
     * Returns the token found by searching VSCode's authentication cache or
     * returns null if no token could be found.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                `TokenCredential` implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Loads the authentication record from the specified path.
     * @param authRecordPath - The path to the authentication record file.
     * @param scopes - The list of scopes for which the token will have access.
     * @returns The authentication record or undefined if loading fails.
     */
    private loadAuthRecord;
}
//# sourceMappingURL=visualStudioCodeCredential.d.ts.map