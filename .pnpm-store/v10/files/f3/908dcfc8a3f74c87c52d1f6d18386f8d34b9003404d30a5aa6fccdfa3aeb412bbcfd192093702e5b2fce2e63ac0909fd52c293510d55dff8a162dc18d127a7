import type { MsalBrowserFlowOptions } from "./msalBrowserOptions.js";
import type { AccessToken } from "@azure/core-auth";
import type { AuthenticationRecord } from "../types.js";
import type { CredentialFlowGetTokenOptions } from "../credentials.js";
/**
 * Methods that are used by InteractiveBrowserCredential
 * @internal
 */
export interface MsalBrowserClient {
    getActiveAccount(): Promise<AuthenticationRecord | undefined>;
    getToken(scopes: string[], options: CredentialFlowGetTokenOptions): Promise<AccessToken>;
}
/**
 * Uses MSAL Browser 2.X for browser authentication,
 * which uses the [Auth Code Flow](https://learn.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow).
 * @internal
 */
export declare function createMsalBrowserClient(options: MsalBrowserFlowOptions): MsalBrowserClient;
//# sourceMappingURL=msalBrowserCommon.d.ts.map