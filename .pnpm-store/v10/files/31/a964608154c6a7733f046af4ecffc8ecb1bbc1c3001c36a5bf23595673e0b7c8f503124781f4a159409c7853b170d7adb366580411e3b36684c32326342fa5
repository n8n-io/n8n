"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsalTokenCredential = void 0;
const _1 = require("./");
/**
 * Token credential implementation that uses MSAL (Microsoft Authentication Library) to acquire access tokens.
 * Implements the Azure Core Auth TokenCredential interface for authentication scenarios.
 */
class MsalTokenCredential {
    /**
     * Creates a new instance of MsalTokenCredential.
     * @param authConfig The authentication configuration to use for token acquisition.
     */
    constructor(authConfig) {
        this.authConfig = authConfig;
    }
    /**
     * Retrieves an access token for the specified scopes using MSAL authentication.
     * @param scopes Array of scopes for which to request an access token. The first scope is used to determine the resource.
     * @param options Optional parameters for token retrieval (currently unused).
     * @returns Promise that resolves to an access token with expiration timestamp.
     */
    async getToken(scopes, options) {
        const scope = scopes[0].substring(0, scopes[0].lastIndexOf('/'));
        const token = await new _1.MsalTokenProvider().getAccessToken(this.authConfig, scope);
        return {
            token,
            expiresOnTimestamp: Date.now() + 10000
        };
    }
}
exports.MsalTokenCredential = MsalTokenCredential;
//# sourceMappingURL=msalTokenCredential.js.map