import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { InteractiveBrowserCredentialInBrowserOptions, InteractiveBrowserCredentialNodeOptions } from "./interactiveBrowserCredentialOptions.js";
import type { AuthenticationRecord } from "../msal/types.js";
/**
 * Enables authentication to Microsoft Entra ID inside of the web browser
 * using the interactive login flow.
 */
export declare class InteractiveBrowserCredential implements TokenCredential {
    private tenantId?;
    private additionallyAllowedTenantIds;
    private msalClient;
    private disableAutomaticAuthentication?;
    /**
     * Creates an instance of the InteractiveBrowserCredential with the
     * details needed to authenticate against Microsoft Entra ID with
     * a user identity.
     *
     * This credential uses the [Authorization Code Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow).
     * On Node.js, it will open a browser window while it listens for a redirect response from the authentication service.
     * On browsers, it authenticates via popups. The `loginStyle` optional parameter can be set to `redirect` to authenticate by redirecting the user to an Azure secure login page, which then will redirect the user back to the web application where the authentication started.
     *
     * It's recommended that the Microsoft Entra Applications used are configured to authenticate using Single Page Applications.
     * More information here: [link](https://learn.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-app-registration#redirect-uri-msaljs-20-with-auth-code-flow).
     *
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(options: InteractiveBrowserCredentialInBrowserOptions | InteractiveBrowserCredentialNodeOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the user provided the option `disableAutomaticAuthentication`,
     * once the token can't be retrieved silently,
     * this method won't attempt to request user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the token can't be retrieved silently, this method will require user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                  TokenCredential implementation might make.
     */
    authenticate(scopes: string | string[], options?: GetTokenOptions): Promise<AuthenticationRecord | undefined>;
}
//# sourceMappingURL=interactiveBrowserCredential-browser.d.mts.map