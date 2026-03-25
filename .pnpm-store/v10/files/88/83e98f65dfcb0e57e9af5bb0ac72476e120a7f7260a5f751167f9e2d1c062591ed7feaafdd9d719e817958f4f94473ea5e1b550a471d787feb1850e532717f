import { Response } from 'express';
import { OAuthRegisteredClientsStore } from '../clients.js';
import { OAuthClientInformationFull, OAuthTokenRevocationRequest, OAuthTokens } from '../../../shared/auth.js';
import { AuthInfo } from '../types.js';
import { AuthorizationParams, OAuthServerProvider } from '../provider.js';
import { FetchLike } from '../../../shared/transport.js';
export type ProxyEndpoints = {
    authorizationUrl: string;
    tokenUrl: string;
    revocationUrl?: string;
    registrationUrl?: string;
};
export type ProxyOptions = {
    /**
     * Individual endpoint URLs for proxying specific OAuth operations
     */
    endpoints: ProxyEndpoints;
    /**
     * Function to verify access tokens and return auth info
     */
    verifyAccessToken: (token: string) => Promise<AuthInfo>;
    /**
     * Function to fetch client information from the upstream server
     */
    getClient: (clientId: string) => Promise<OAuthClientInformationFull | undefined>;
    /**
     * Custom fetch implementation used for all network requests.
     */
    fetch?: FetchLike;
};
/**
 * Implements an OAuth server that proxies requests to another OAuth server.
 */
export declare class ProxyOAuthServerProvider implements OAuthServerProvider {
    protected readonly _endpoints: ProxyEndpoints;
    protected readonly _verifyAccessToken: (token: string) => Promise<AuthInfo>;
    protected readonly _getClient: (clientId: string) => Promise<OAuthClientInformationFull | undefined>;
    protected readonly _fetch?: FetchLike;
    skipLocalPkceValidation: boolean;
    revokeToken?: (client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest) => Promise<void>;
    constructor(options: ProxyOptions);
    get clientsStore(): OAuthRegisteredClientsStore;
    authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void>;
    challengeForAuthorizationCode(_client: OAuthClientInformationFull, _authorizationCode: string): Promise<string>;
    exchangeAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string, codeVerifier?: string, redirectUri?: string, resource?: URL): Promise<OAuthTokens>;
    exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[], resource?: URL): Promise<OAuthTokens>;
    verifyAccessToken(token: string): Promise<AuthInfo>;
}
//# sourceMappingURL=proxyProvider.d.ts.map