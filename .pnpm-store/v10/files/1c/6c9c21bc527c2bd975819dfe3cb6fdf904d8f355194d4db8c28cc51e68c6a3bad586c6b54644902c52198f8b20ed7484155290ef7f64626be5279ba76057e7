import { ResponseMode, OAuthResponseType } from "../utils/Constants.js";
import { StringDict } from "../utils/MsalTypes.js";
import { ApplicationTelemetry, LibraryInfo } from "../config/ClientConfiguration.js";
import { ServerTelemetryManager } from "../telemetry/server/ServerTelemetryManager.js";
import { ClientInfo } from "../account/ClientInfo.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
export declare function instrumentBrokerParams(parameters: Map<string, string>, correlationId?: string, performanceClient?: IPerformanceClient): void;
/**
 * Add the given response_type
 * @param parameters
 * @param responseType
 */
export declare function addResponseType(parameters: Map<string, string>, responseType: OAuthResponseType): void;
/**
 * add response_mode. defaults to query.
 * @param responseMode
 */
export declare function addResponseMode(parameters: Map<string, string>, responseMode?: ResponseMode): void;
/**
 * Add flag to indicate STS should attempt to use WAM if available
 */
export declare function addNativeBroker(parameters: Map<string, string>): void;
/**
 * add scopes. set addOidcScopes to false to prevent default scopes in non-user scenarios
 * @param scopeSet
 * @param addOidcScopes
 */
export declare function addScopes(parameters: Map<string, string>, scopes: string[], addOidcScopes?: boolean, defaultScopes?: Array<string>): void;
/**
 * add clientId
 * @param clientId
 */
export declare function addClientId(parameters: Map<string, string>, clientId: string): void;
/**
 * add redirect_uri
 * @param redirectUri
 */
export declare function addRedirectUri(parameters: Map<string, string>, redirectUri: string): void;
/**
 * add post logout redirectUri
 * @param redirectUri
 */
export declare function addPostLogoutRedirectUri(parameters: Map<string, string>, redirectUri: string): void;
/**
 * add id_token_hint to logout request
 * @param idTokenHint
 */
export declare function addIdTokenHint(parameters: Map<string, string>, idTokenHint: string): void;
/**
 * add domain_hint
 * @param domainHint
 */
export declare function addDomainHint(parameters: Map<string, string>, domainHint: string): void;
/**
 * add login_hint
 * @param loginHint
 */
export declare function addLoginHint(parameters: Map<string, string>, loginHint: string): void;
/**
 * Adds the CCS (Cache Credential Service) query parameter for login_hint
 * @param loginHint
 */
export declare function addCcsUpn(parameters: Map<string, string>, loginHint: string): void;
/**
 * Adds the CCS (Cache Credential Service) query parameter for account object
 * @param loginHint
 */
export declare function addCcsOid(parameters: Map<string, string>, clientInfo: ClientInfo): void;
/**
 * add sid
 * @param sid
 */
export declare function addSid(parameters: Map<string, string>, sid: string): void;
/**
 * add claims
 * @param claims
 */
export declare function addClaims(parameters: Map<string, string>, claims?: string, clientCapabilities?: Array<string>): void;
/**
 * add correlationId
 * @param correlationId
 */
export declare function addCorrelationId(parameters: Map<string, string>, correlationId: string): void;
/**
 * add library info query params
 * @param libraryInfo
 */
export declare function addLibraryInfo(parameters: Map<string, string>, libraryInfo: LibraryInfo): void;
/**
 * Add client telemetry parameters
 * @param appTelemetry
 */
export declare function addApplicationTelemetry(parameters: Map<string, string>, appTelemetry: ApplicationTelemetry): void;
/**
 * add prompt
 * @param prompt
 */
export declare function addPrompt(parameters: Map<string, string>, prompt: string): void;
/**
 * add state
 * @param state
 */
export declare function addState(parameters: Map<string, string>, state: string): void;
/**
 * add nonce
 * @param nonce
 */
export declare function addNonce(parameters: Map<string, string>, nonce: string): void;
/**
 * add code_challenge and code_challenge_method
 * - throw if either of them are not passed
 * @param codeChallenge
 * @param codeChallengeMethod
 */
export declare function addCodeChallengeParams(parameters: Map<string, string>, codeChallenge?: string, codeChallengeMethod?: string): void;
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
export declare function addAuthorizationCode(parameters: Map<string, string>, code: string): void;
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
export declare function addDeviceCode(parameters: Map<string, string>, code: string): void;
/**
 * add the `refreshToken` passed by the user
 * @param refreshToken
 */
export declare function addRefreshToken(parameters: Map<string, string>, refreshToken: string): void;
/**
 * add the `code_verifier` passed by the user to exchange for a token
 * @param codeVerifier
 */
export declare function addCodeVerifier(parameters: Map<string, string>, codeVerifier: string): void;
/**
 * add client_secret
 * @param clientSecret
 */
export declare function addClientSecret(parameters: Map<string, string>, clientSecret: string): void;
/**
 * add clientAssertion for confidential client flows
 * @param clientAssertion
 */
export declare function addClientAssertion(parameters: Map<string, string>, clientAssertion: string): void;
/**
 * add clientAssertionType for confidential client flows
 * @param clientAssertionType
 */
export declare function addClientAssertionType(parameters: Map<string, string>, clientAssertionType: string): void;
/**
 * add OBO assertion for confidential client flows
 * @param clientAssertion
 */
export declare function addOboAssertion(parameters: Map<string, string>, oboAssertion: string): void;
/**
 * add grant type
 * @param grantType
 */
export declare function addRequestTokenUse(parameters: Map<string, string>, tokenUse: string): void;
/**
 * add grant type
 * @param grantType
 */
export declare function addGrantType(parameters: Map<string, string>, grantType: string): void;
/**
 * add client info
 *
 */
export declare function addClientInfo(parameters: Map<string, string>): void;
export declare function addInstanceAware(parameters: Map<string, string>): void;
/**
 * add extraQueryParams
 * @param eQParams
 */
export declare function addExtraQueryParameters(parameters: Map<string, string>, eQParams: StringDict): void;
export declare function addClientCapabilitiesToClaims(claims?: string, clientCapabilities?: Array<string>): string;
/**
 * adds `username` for Password Grant flow
 * @param username
 */
export declare function addUsername(parameters: Map<string, string>, username: string): void;
/**
 * adds `password` for Password Grant flow
 * @param password
 */
export declare function addPassword(parameters: Map<string, string>, password: string): void;
/**
 * add pop_jwk to query params
 * @param cnfString
 */
export declare function addPopToken(parameters: Map<string, string>, cnfString: string): void;
/**
 * add SSH JWK and key ID to query params
 */
export declare function addSshJwk(parameters: Map<string, string>, sshJwkString: string): void;
/**
 * add server telemetry fields
 * @param serverTelemetryManager
 */
export declare function addServerTelemetry(parameters: Map<string, string>, serverTelemetryManager: ServerTelemetryManager): void;
/**
 * Adds parameter that indicates to the server that throttling is supported
 */
export declare function addThrottling(parameters: Map<string, string>): void;
/**
 * Adds logout_hint parameter for "silent" logout which prevent server account picker
 */
export declare function addLogoutHint(parameters: Map<string, string>, logoutHint: string): void;
export declare function addBrokerParameters(parameters: Map<string, string>, brokerClientId: string, brokerRedirectUri: string): void;
/**
 * Add EAR (Encrypted Authorize Response) request parameters
 * @param parameters
 * @param jwk
 */
export declare function addEARParameters(parameters: Map<string, string>, jwk: string): void;
/**
 * Adds authorize body parameters to the request parameters
 * @param parameters
 * @param bodyParameters
 */
export declare function addPostBodyParameters(parameters: Map<string, string>, bodyParameters: StringDict): void;
//# sourceMappingURL=RequestParameterBuilder.d.ts.map