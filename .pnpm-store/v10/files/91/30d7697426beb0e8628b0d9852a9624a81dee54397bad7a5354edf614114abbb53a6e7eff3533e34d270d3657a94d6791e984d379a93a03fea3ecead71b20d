import { ClientConfiguration } from "../config/ClientConfiguration.js";
import { BaseClient } from "./BaseClient.js";
import { CommonRefreshTokenRequest } from "../request/CommonRefreshTokenRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { CommonSilentFlowRequest } from "../request/CommonSilentFlowRequest.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
/**
 * OAuth2.0 refresh token client
 * @internal
 */
export declare class RefreshTokenClient extends BaseClient {
    constructor(configuration: ClientConfiguration, performanceClient?: IPerformanceClient);
    acquireToken(request: CommonRefreshTokenRequest): Promise<AuthenticationResult>;
    /**
     * Gets cached refresh token and attaches to request, then calls acquireToken API
     * @param request
     */
    acquireTokenByRefreshToken(request: CommonSilentFlowRequest): Promise<AuthenticationResult>;
    /**
     * makes a network call to acquire tokens by exchanging RefreshToken available in userCache; throws if refresh token is not cached
     * @param request
     */
    private acquireTokenWithCachedRefreshToken;
    /**
     * Constructs the network message and makes a NW call to the underlying secure token service
     * @param request
     * @param authority
     */
    private executeTokenRequest;
    /**
     * Helper function to create the token request body
     * @param request
     */
    private createTokenRequestBody;
}
//# sourceMappingURL=RefreshTokenClient.d.ts.map