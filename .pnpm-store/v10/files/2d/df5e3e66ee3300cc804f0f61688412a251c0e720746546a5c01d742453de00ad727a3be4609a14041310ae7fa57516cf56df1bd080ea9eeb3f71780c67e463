import { TokenOptions, Transporter } from './tokenOptions';
import { TokenData } from './getToken';
/**
 * Options for fetching an access token.
 */
export interface GetTokenOptions {
    /**
     * If true, a new token will be fetched, ignoring any cached token.
     */
    forceRefresh?: boolean;
}
/**
 * Callback type for the `getToken` method.
 */
export type GetTokenCallback = (err: Error | null, token?: TokenData) => void;
/**
 * The GoogleToken class is used to manage authentication with Google's OAuth 2.0 authorization server.
 * It handles fetching, caching, and refreshing of access tokens.
 */
declare class GoogleToken {
    /** The configuration options for this token instance. */
    private tokenOptions;
    /** The handler for token fetching and caching logic. */
    private tokenHandler;
    /**
     * Create a GoogleToken.
     *
     * @param options  Configuration object.
     */
    constructor(options?: TokenOptions);
    get expiresAt(): number | undefined;
    /**
     * The most recent access token obtained by this client.
     */
    get accessToken(): string | undefined;
    /**
     * The most recent ID token obtained by this client.
     */
    get idToken(): string | undefined;
    /**
     * The token type of the most recent access token.
     */
    get tokenType(): string | undefined;
    /**
     * The refresh token for the current credentials.
     */
    get refreshToken(): string | undefined;
    /**
     * A boolean indicating if the current token has expired.
     */
    hasExpired(): boolean;
    /**
     * A boolean indicating if the current token is expiring soon,
     * based on the `eagerRefreshThresholdMillis` option.
     */
    isTokenExpiring(): boolean;
    /**
     * Fetches a new access token and returns it.
     * @param opts Options for fetching the token.
     */
    getToken(opts?: GetTokenOptions): Promise<TokenData>;
    getToken(callback: GetTokenCallback, opts?: GetTokenOptions): void;
    /**
     * Revokes the current access token and resets the token handler.
     */
    revokeToken(): Promise<void>;
    revokeToken(callback: (err?: Error) => void): void;
    /**
     * Returns the configuration options for this token instance.
     */
    get googleTokenOptions(): TokenOptions;
}
export { GoogleToken, Transporter, TokenOptions, TokenData };
