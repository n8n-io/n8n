import { AuthenticationResult, Authority, BaseClient, CacheManager, CacheOutcome, ClientConfiguration, CommonClientCredentialRequest, IAppTokenProvider, ICrypto, ServerTelemetryManager } from "@azure/msal-common/node";
import { ManagedIdentityConfiguration } from "../config/Configuration.js";
/**
 * OAuth2.0 client credential grant
 * @public
 */
export declare class ClientCredentialClient extends BaseClient {
    private readonly appTokenProvider?;
    constructor(configuration: ClientConfiguration, appTokenProvider?: IAppTokenProvider);
    /**
     * Public API to acquire a token with ClientCredential Flow for Confidential clients
     * @param request - CommonClientCredentialRequest provided by the developer
     */
    acquireToken(request: CommonClientCredentialRequest): Promise<AuthenticationResult | null>;
    /**
     * looks up cache if the tokens are cached already
     */
    getCachedAuthenticationResult(request: CommonClientCredentialRequest, config: ClientConfiguration | ManagedIdentityConfiguration, cryptoUtils: ICrypto, authority: Authority, cacheManager: CacheManager, serverTelemetryManager?: ServerTelemetryManager | null): Promise<[AuthenticationResult | null, CacheOutcome]>;
    /**
     * Reads access token from the cache
     */
    private readAccessTokenFromCache;
    /**
     * Makes a network call to request the token from the service
     * @param request - CommonClientCredentialRequest provided by the developer
     * @param authority - authority object
     */
    private executeTokenRequest;
    /**
     * generate the request to the server in the acceptable format
     * @param request - CommonClientCredentialRequest provided by the developer
     */
    private createTokenRequestBody;
}
//# sourceMappingURL=ClientCredentialClient.d.ts.map