import { ClientConfiguration, AuthenticationResult, Authority, BaseAuthRequest, Logger, ServerTelemetryManager, AzureRegionConfiguration, AzureCloudOptions, AuthorizationCodePayload, ClientAssertionCallback } from "@azure/msal-common/node";
import { Configuration, NodeConfiguration } from "../config/Configuration.js";
import { CryptoProvider } from "../crypto/CryptoProvider.js";
import { NodeStorage } from "../cache/NodeStorage.js";
import { TokenCache } from "../cache/TokenCache.js";
import { ClientAssertion } from "./ClientAssertion.js";
import { AuthorizationUrlRequest } from "../request/AuthorizationUrlRequest.js";
import { AuthorizationCodeRequest } from "../request/AuthorizationCodeRequest.js";
import { RefreshTokenRequest } from "../request/RefreshTokenRequest.js";
import { SilentFlowRequest } from "../request/SilentFlowRequest.js";
import { UsernamePasswordRequest } from "../request/UsernamePasswordRequest.js";
/**
 * Base abstract class for all ClientApplications - public and confidential
 * @public
 */
export declare abstract class ClientApplication {
    protected readonly cryptoProvider: CryptoProvider;
    private tokenCache;
    /**
     * Platform storage object
     */
    protected storage: NodeStorage;
    /**
     * Logger object to log the application flow
     */
    protected logger: Logger;
    /**
     * Platform configuration initialized by the application
     */
    protected config: NodeConfiguration;
    /**
     * Client assertion passed by the user for confidential client flows
     */
    protected clientAssertion: ClientAssertion;
    protected developerProvidedClientAssertion: string | ClientAssertionCallback;
    /**
     * Client secret passed by the user for confidential client flows
     */
    protected clientSecret: string;
    /**
     * Constructor for the ClientApplication
     */
    protected constructor(configuration: Configuration);
    /**
     * Creates the URL of the authorization request, letting the user input credentials and consent to the
     * application. The URL targets the /authorize endpoint of the authority configured in the
     * application object.
     *
     * Once the user inputs their credentials and consents, the authority will send a response to the redirect URI
     * sent in the request and should contain an authorization code, which can then be used to acquire tokens via
     * `acquireTokenByCode(AuthorizationCodeRequest)`.
     */
    getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;
    /**
     * Acquires a token by exchanging the Authorization Code received from the first step of OAuth2.0
     * Authorization Code flow.
     *
     * `getAuthCodeUrl(AuthorizationCodeUrlRequest)` can be used to create the URL for the first step of OAuth2.0
     * Authorization Code flow. Ensure that values for redirectUri and scopes in AuthorizationCodeUrlRequest and
     * AuthorizationCodeRequest are the same.
     */
    acquireTokenByCode(request: AuthorizationCodeRequest, authCodePayLoad?: AuthorizationCodePayload): Promise<AuthenticationResult>;
    /**
     * Acquires a token by exchanging the refresh token provided for a new set of tokens.
     *
     * This API is provided only for scenarios where you would like to migrate from ADAL to MSAL. Otherwise, it is
     * recommended that you use `acquireTokenSilent()` for silent scenarios. When using `acquireTokenSilent()`, MSAL will
     * handle the caching and refreshing of tokens automatically.
     */
    acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires a token silently when a user specifies the account the token is requested for.
     *
     * This API expects the user to provide an account object and looks into the cache to retrieve the token if present.
     * There is also an optional "forceRefresh" boolean the user can send to bypass the cache for access_token and id_token.
     * In case the refresh_token is expired or not found, an error is thrown
     * and the guidance is for the user to call any interactive token acquisition API (eg: `acquireTokenByCode()`).
     */
    acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult>;
    private acquireCachedTokenSilent;
    /**
     * Acquires tokens with password grant by exchanging client applications username and password for credentials
     *
     * The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely.
     * More details on this recommendation at https://tools.ietf.org/html/draft-ietf-oauth-security-topics-13#section-3.4
     * Microsoft's documentation and recommendations are at:
     * https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-authentication-flows#usernamepassword
     *
     * @param request - UsenamePasswordRequest
     * @deprecated - Use a more secure flow instead
     */
    acquireTokenByUsernamePassword(request: UsernamePasswordRequest): Promise<AuthenticationResult | null>;
    /**
     * Gets the token cache for the application.
     */
    getTokenCache(): TokenCache;
    /**
     * Validates OIDC state by comparing the user cached state with the state received from the server.
     *
     * This API is provided for scenarios where you would use OAuth2.0 state parameter to mitigate against
     * CSRF attacks.
     * For more information about state, visit https://datatracker.ietf.org/doc/html/rfc6819#section-3.6.
     * @param state - Unique GUID generated by the user that is cached by the user and sent to the server during the first leg of the flow
     * @param cachedState - This string is sent back by the server with the authorization code
     */
    protected validateState(state: string, cachedState: string): void;
    /**
     * Returns the logger instance
     */
    getLogger(): Logger;
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger - Logger instance
     */
    setLogger(logger: Logger): void;
    /**
     * Builds the common configuration to be passed to the common component based on the platform configurarion
     * @param authority - user passed authority in configuration
     * @param serverTelemetryManager - initializes servertelemetry if passed
     */
    protected buildOauthClientConfiguration(discoveredAuthority: Authority, requestCorrelationId: string, redirectUri: string, serverTelemetryManager?: ServerTelemetryManager): Promise<ClientConfiguration>;
    private getClientAssertion;
    /**
     * Generates a request with the default scopes & generates a correlationId.
     * @param authRequest - BaseAuthRequest for initialization
     */
    protected initializeBaseRequest(authRequest: Partial<BaseAuthRequest>): Promise<BaseAuthRequest>;
    /**
     * Initializes the server telemetry payload
     * @param apiId - Id for a specific request
     * @param correlationId - GUID
     * @param forceRefresh - boolean to indicate network call
     */
    protected initializeServerTelemetryManager(apiId: number, correlationId: string, forceRefresh?: boolean): ServerTelemetryManager;
    /**
     * Create authority instance. If authority not passed in request, default to authority set on the application
     * object. If no authority set in application object, then default to common authority.
     * @param authorityString - authority from user configuration
     */
    protected createAuthority(authorityString: string, requestCorrelationId: string, azureRegionConfiguration?: AzureRegionConfiguration, azureCloudOptions?: AzureCloudOptions): Promise<Authority>;
    /**
     * Clear the cache
     */
    clearCache(): void;
}
//# sourceMappingURL=ClientApplication.d.ts.map