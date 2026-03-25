import type { AuthenticationRecord } from "../types.js";
import type { BrowserLoginStyle } from "../../credentials/interactiveBrowserCredentialOptions.js";
import type { LogPolicyOptions } from "@azure/core-rest-pipeline";
import type { MultiTenantTokenCredentialOptions } from "../../credentials/multiTenantTokenCredentialOptions.js";
import type { CredentialLogger } from "../../util/logging.js";
/**
 * Options for the MSAL browser flows.
 * @internal
 */
export interface MsalBrowserFlowOptions {
    logger: CredentialLogger;
    /**
     * The Client ID of the Microsoft Entra application that users will sign into.
     * This parameter is required on the browser.
     */
    clientId?: string;
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId?: string;
    /**
     * The authority host to use for authentication requests.
     * Possible values are available through {@link AzureAuthorityHosts}.
     * The default is "https://login.microsoftonline.com".
     */
    authorityHost?: string;
    /**
     * Result of a previous authentication that can be used to retrieve the cached credentials of each individual account.
     * This is necessary to provide in case the application wants to work with more than one account per
     * Client ID and Tenant ID pair.
     *
     * This record can be retrieved by calling to the credential's `authenticate()` method, as follows:
     *
     *     const authenticationRecord = await credential.authenticate();
     *
     */
    authenticationRecord?: AuthenticationRecord;
    /**
     * Makes getToken throw if a manual authentication is necessary.
     * Developers will need to call to `authenticate()` to control when to manually authenticate.
     */
    disableAutomaticAuthentication?: boolean;
    /**
     * The field determines whether instance discovery is performed when attempting to authenticate.
     * Setting this to `true` will completely disable both instance discovery and authority validation.
     * As a result, it's crucial to ensure that the configured authority host is valid and trustworthy.
     * This functionality is intended for use in scenarios where the metadata endpoint cannot be reached, such as in private clouds or Azure Stack.
     * The process of instance discovery entails retrieving authority metadata from https://login.microsoft.com/ to validate the authority.
     */
    disableInstanceDiscovery?: boolean;
    /**
     * Options for multi-tenant applications which allows for additionally allowed tenants.
     */
    tokenCredentialOptions: MultiTenantTokenCredentialOptions;
    /**
     * Gets the redirect URI of the application. This should be same as the value
     * in the application registration portal.  Defaults to `window.location.href`.
     * This field is no longer required for Node.js.
     */
    redirectUri?: string;
    /**
     * Specifies whether a redirect or a popup window should be used to
     * initiate the user authentication flow. Possible values are "redirect"
     * or "popup" (default) for browser and "popup" (default) for node.
     *
     */
    loginStyle: BrowserLoginStyle;
    /**
     * loginHint allows a user name to be pre-selected for interactive logins.
     * Setting this option skips the account selection prompt and immediately attempts to login with the specified account.
     */
    loginHint?: string;
    /**
     * Allows users to configure settings for logging policy options, allow logging account information and personally identifiable information for customer support.
     */
    loggingOptions?: LogPolicyOptions & {
        /**
         * Allows logging account information once the authentication flow succeeds.
         */
        allowLoggingAccountIdentifiers?: boolean;
        /**
         * Allows logging personally identifiable information for customer support.
         */
        enableUnsafeSupportLogging?: boolean;
    };
}
//# sourceMappingURL=msalBrowserOptions.d.ts.map