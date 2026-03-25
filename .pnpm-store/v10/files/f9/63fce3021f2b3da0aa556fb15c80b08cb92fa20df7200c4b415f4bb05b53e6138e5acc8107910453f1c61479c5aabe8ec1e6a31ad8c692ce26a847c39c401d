import { AuthenticationResult, BaseClient, ClientConfiguration, CommonUsernamePasswordRequest } from "@azure/msal-common/node";
/**
 * Oauth2.0 Password grant client
 * Note: We are only supporting public clients for password grant and for purely testing purposes
 * @public
 * @deprecated - Use a more secure flow instead
 */
export declare class UsernamePasswordClient extends BaseClient {
    constructor(configuration: ClientConfiguration);
    /**
     * API to acquire a token by passing the username and password to the service in exchage of credentials
     * password_grant
     * @param request - CommonUsernamePasswordRequest
     */
    acquireToken(request: CommonUsernamePasswordRequest): Promise<AuthenticationResult | null>;
    /**
     * Executes POST request to token endpoint
     * @param authority - authority object
     * @param request - CommonUsernamePasswordRequest provided by the developer
     */
    private executeTokenRequest;
    /**
     * Generates a map for all the params to be sent to the service
     * @param request - CommonUsernamePasswordRequest provided by the developer
     */
    private createTokenRequestBody;
}
//# sourceMappingURL=UsernamePasswordClient.d.ts.map