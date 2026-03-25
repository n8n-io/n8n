import type { BrowserCustomizationOptions } from "./browserCustomizationOptions.js";
import type { BrokerAuthOptions } from "./brokerAuthOptions.js";
import type { CredentialPersistenceOptions } from "./credentialPersistenceOptions.js";
import type { InteractiveCredentialOptions } from "./interactiveCredentialOptions.js";
/**
 * (Browser-only feature)
 * The "login style" to use in the authentication flow:
 * - "redirect" redirects the user to the authentication page and then
 *   redirects them back to the page once authentication is completed.
 * - "popup" opens a new browser window through with the redirect flow
 *   is initiated.  The user's existing browser window does not leave
 *   the current page
 */
export type BrowserLoginStyle = "redirect" | "popup";
/**
 * Defines the common options for the InteractiveBrowserCredential class.
 */
export interface InteractiveBrowserCredentialNodeOptions extends InteractiveCredentialOptions, CredentialPersistenceOptions, BrowserCustomizationOptions, BrokerAuthOptions {
    /**
     * Gets the redirect URI of the application. This should be same as the value
     * in the application registration portal.  Defaults to `window.location.href`.
     * This field is no longer required for Node.js.
     */
    redirectUri?: string | (() => string);
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId?: string;
    /**
     * The Client ID of the Microsoft Entra application that users will sign into.
     * It is recommended that developers register their applications and assign appropriate roles.
     * For more information, visit https://aka.ms/identity/AppRegistrationAndRoleAssignment.
     * If not specified, users will authenticate to an Azure development application,
     * which is not recommended for production scenarios.
     */
    clientId?: string;
    /**
     * loginHint allows a user name to be pre-selected for interactive logins.
     * Setting this option skips the account selection prompt and immediately attempts to login with the specified account.
     */
    loginHint?: string;
}
/**
 * Defines the common options for the InteractiveBrowserCredential class.
 */
export interface InteractiveBrowserCredentialInBrowserOptions extends InteractiveCredentialOptions {
    /**
     * Gets the redirect URI of the application. This should be same as the value
     * in the application registration portal.  Defaults to `window.location.href`.
     * This field is no longer required for Node.js.
     */
    redirectUri?: string | (() => string);
    /**
     * The Microsoft Entra tenant (directory) ID.
     */
    tenantId?: string;
    /**
     * The Client ID of the Microsoft Entra application that users will sign into.
     * This parameter is required on the browser.
     * Developers need to register their applications and assign appropriate roles.
     * For more information, visit https://aka.ms/identity/AppRegistrationAndRoleAssignment.
     */
    clientId: string;
    /**
     * Specifies whether a redirect or a popup window should be used to
     * initiate the user authentication flow. Possible values are "redirect"
     * or "popup" (default) for browser and "popup" (default) for node.
     *
     */
    loginStyle?: BrowserLoginStyle;
    /**
     * loginHint allows a user name to be pre-selected for interactive logins.
     * Setting this option skips the account selection prompt and immediately attempts to login with the specified account.
     */
    loginHint?: string;
}
//# sourceMappingURL=interactiveBrowserCredentialOptions.d.ts.map