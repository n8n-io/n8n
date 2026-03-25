import { BaseClient } from "./BaseClient.js";
import { CommonAuthorizationCodeRequest } from "../request/CommonAuthorizationCodeRequest.js";
import { ClientConfiguration } from "../config/ClientConfiguration.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { CommonEndSessionRequest } from "../request/CommonEndSessionRequest.js";
import { AuthorizationCodePayload } from "../response/AuthorizationCodePayload.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
/**
 * Oauth2.0 Authorization Code client
 * @internal
 */
export declare class AuthorizationCodeClient extends BaseClient {
    protected includeRedirectUri: boolean;
    private oidcDefaultScopes;
    constructor(configuration: ClientConfiguration, performanceClient?: IPerformanceClient);
    /**
     * API to acquire a token in exchange of 'authorization_code` acquired by the user in the first leg of the
     * authorization_code_grant
     * @param request
     */
    acquireToken(request: CommonAuthorizationCodeRequest, authCodePayload?: AuthorizationCodePayload): Promise<AuthenticationResult>;
    /**
     * Used to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param authorityUri
     */
    getLogoutUri(logoutRequest: CommonEndSessionRequest): string;
    /**
     * Executes POST request to token endpoint
     * @param authority
     * @param request
     */
    private executeTokenRequest;
    /**
     * Generates a map for all the params to be sent to the service
     * @param request
     */
    private createTokenRequestBody;
    /**
     * This API validates the `EndSessionRequest` and creates a URL
     * @param request
     */
    private createLogoutUrlQueryString;
}
//# sourceMappingURL=AuthorizationCodeClient.d.ts.map