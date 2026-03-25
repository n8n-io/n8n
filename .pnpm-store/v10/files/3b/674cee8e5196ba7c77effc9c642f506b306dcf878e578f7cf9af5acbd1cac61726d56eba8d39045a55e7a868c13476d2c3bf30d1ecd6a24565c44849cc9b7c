import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import { AccountInfo, CommonSilentFlowRequest } from "@azure/msal-common/browser";
import { AuthenticationResult } from "../../../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../../../request/ClearCacheRequest.js";
export declare class CustomAuthSilentCacheClient extends CustomAuthInteractionClientBase {
    /**
     * Acquires a token from the cache if it is not expired. Otherwise, makes a request to renew the token.
     * If forceRresh is set to false, then looks up the access token in cache first.
     *   If access token is expired or not found, then uses refresh token to get a new access token.
     *   If no refresh token is found or it is expired, then throws error.
     * If forceRefresh is set to true, then skips token cache lookup and fetches a new token using refresh token
     *   If no refresh token is found or it is expired, then throws error.
     * @param silentRequest The silent request object.
     * @returns {Promise<AuthenticationResult>} The promise that resolves to an AuthenticationResult.
     */
    acquireToken(silentRequest: CommonSilentFlowRequest): Promise<AuthenticationResult>;
    logout(logoutRequest?: ClearCacheRequest): Promise<void>;
    getCurrentAccount(correlationId: string): AccountInfo | null;
    private getCustomAuthClientConfiguration;
}
//# sourceMappingURL=CustomAuthSilentCacheClient.d.ts.map