import type { AccessToken, GetTokenOptions } from "@azure/core-auth";
import type { AuthenticationRecord } from "./types.js";
/**
 * The MSAL clients `getToken` requests can receive a `correlationId` and `disableAutomaticAuthentication`.
 * (which is used to prevent `getToken` from triggering the manual authentication if `getTokenSilent`  fails).
 * @internal
 */
export interface CredentialFlowGetTokenOptions extends GetTokenOptions {
    /**
     * Unique identifier useful to track outgoing requests.
     */
    correlationId?: string;
    /**
     * Makes getToken throw if a manual authentication is necessary.
     */
    disableAutomaticAuthentication?: boolean;
    /**
     * Authority, to overwrite the default one, if necessary.
     */
    authority?: string;
    /**
     * Claims received from challenges.
     */
    claims?: string;
    /**
     * Indicates to allow Continuous Access Evaluation or not
     */
    enableCae?: boolean;
    /**
     * Client Assertion
     */
    getAssertion?: () => Promise<string>;
}
/**
 * Simplified representation of the internal authentication flow.
 * @internal
 */
export interface CredentialFlow {
    /**
     * Clears the MSAL cache.
     */
    logout(): Promise<void>;
    /**
     * Tries to load the active account, either from memory or from MSAL.
     */
    getActiveAccount(): Promise<AuthenticationRecord | undefined>;
    /**
     * Calls to the implementation's doGetToken method.
     */
    getToken(scopes?: string[], options?: CredentialFlowGetTokenOptions): Promise<AccessToken | null>;
}
//# sourceMappingURL=credentials.d.ts.map