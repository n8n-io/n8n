import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { CommonSilentFlowRequest } from "@azure/msal-common/browser";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
export declare class SilentCacheClient extends StandardInteractionClient {
    /**
     * Returns unexpired tokens from the cache, if available
     * @param silentRequest
     */
    acquireToken(silentRequest: CommonSilentFlowRequest): Promise<AuthenticationResult>;
    /**
     * API to silenty clear the browser cache.
     * @param logoutRequest
     */
    logout(logoutRequest?: ClearCacheRequest): Promise<void>;
}
//# sourceMappingURL=SilentCacheClient.d.ts.map