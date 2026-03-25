import type { INetworkModule, NetworkRequestOptions, NetworkResponse } from "@azure/msal-node";
import type { AccessToken, GetTokenOptions } from "@azure/core-auth";
import { ServiceClient } from "@azure/core-client";
import type { PipelineRequest } from "@azure/core-rest-pipeline";
import type { AbortSignalLike } from "@azure/abort-controller";
import type { TokenCredentialOptions } from "../tokenCredentialOptions.js";
/**
 * An internal type used to communicate details of a token request's
 * response that should not be sent back as part of the access token.
 */
export interface TokenResponse {
    /**
     * The AccessToken to be returned from getToken.
     */
    accessToken: AccessToken;
    /**
     * The refresh token if the 'offline_access' scope was used.
     */
    refreshToken?: string;
}
/**
 * @internal
 */
export declare function getIdentityClientAuthorityHost(options?: TokenCredentialOptions): string;
/**
 * The network module used by the Identity credentials.
 *
 * It allows for credentials to abort any pending request independently of the MSAL flow,
 * by calling to the `abortRequests()` method.
 *
 */
export declare class IdentityClient extends ServiceClient implements INetworkModule {
    authorityHost: string;
    private allowLoggingAccountIdentifiers?;
    private abortControllers;
    private allowInsecureConnection;
    private tokenCredentialOptions;
    constructor(options?: TokenCredentialOptions);
    sendTokenRequest(request: PipelineRequest): Promise<TokenResponse | null>;
    refreshAccessToken(tenantId: string, clientId: string, scopes: string, refreshToken: string | undefined, clientSecret: string | undefined, options?: GetTokenOptions): Promise<TokenResponse | null>;
    generateAbortSignal(correlationId: string): AbortSignalLike;
    abortRequests(correlationId?: string): void;
    getCorrelationId(options?: NetworkRequestOptions): string;
    sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
    sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
    /**
     *
     * @internal
     */
    getTokenCredentialOptions(): TokenCredentialOptions;
    /**
     * If allowLoggingAccountIdentifiers was set on the constructor options
     * we try to log the account identifiers by parsing the received access token.
     *
     * The account identifiers we try to log are:
     * - `appid`: The application or Client Identifier.
     * - `upn`: User Principal Name.
     *   - It might not be available in some authentication scenarios.
     *   - If it's not available, we put a placeholder: "No User Principal Name available".
     * - `tid`: Tenant Identifier.
     * - `oid`: Object Identifier of the authenticated user.
     */
    private logIdentifiers;
}
//# sourceMappingURL=identityClient.d.ts.map