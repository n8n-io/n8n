import type { AccessToken, TokenCredential } from "@azure/core-auth";
import type { AuthorizationCodeCredentialOptions } from "./authorizationCodeCredentialOptions.js";
export declare class AuthorizationCodeCredential implements TokenCredential {
    /**
     * Only available in Node.js
     */
    constructor(tenantId: string | "common", clientId: string, clientSecret: string, authorizationCode: string, redirectUri: string, options?: AuthorizationCodeCredentialOptions);
    constructor(tenantId: string | "common", clientId: string, authorizationCode: string, redirectUri: string, options?: AuthorizationCodeCredentialOptions);
    getToken(): Promise<AccessToken | null>;
}
//# sourceMappingURL=authorizationCodeCredential-browser.d.mts.map