import { StandardInteractionClient } from "./StandardInteractionClient.js";
import { CommonSilentFlowRequest, ServerTelemetryManager, RefreshTokenClient, AzureCloudOptions, AccountInfo, StringDict } from "@azure/msal-common/browser";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
export declare class SilentRefreshClient extends StandardInteractionClient {
    /**
     * Exchanges the refresh token for new tokens
     * @param request
     */
    acquireToken(request: CommonSilentFlowRequest): Promise<AuthenticationResult>;
    /**
     * Currently Unsupported
     */
    logout(): Promise<void>;
    /**
     * Creates a Refresh Client with the given authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         authorityUrl?: string;
     *         azureCloudOptions?: AzureCloudOptions;
     *         extraQueryParams?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    protected createRefreshTokenClient(params: {
        serverTelemetryManager: ServerTelemetryManager;
        authorityUrl?: string;
        azureCloudOptions?: AzureCloudOptions;
        extraQueryParameters?: StringDict;
        account?: AccountInfo;
    }): Promise<RefreshTokenClient>;
}
//# sourceMappingURL=SilentRefreshClient.d.ts.map