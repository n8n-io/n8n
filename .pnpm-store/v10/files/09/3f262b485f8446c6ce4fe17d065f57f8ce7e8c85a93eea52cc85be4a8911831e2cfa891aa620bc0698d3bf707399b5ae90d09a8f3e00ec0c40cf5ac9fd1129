import { TokenOptions } from './tokenOptions';
/**
 * Interface for the data returned from the token endpoint.
 */
interface TokenData {
    /** An optional refresh token. */
    refresh_token?: string;
    /** The duration of the token in seconds. */
    expires_in?: number;
    /** The access token. */
    access_token?: string;
    /** The type of token, e.g., "Bearer". */
    token_type?: string;
    /** An optional ID token. */
    id_token?: string;
}
/**
 * Fetches an access token.
 * @param tokenOptions The options for the token.
 * @returns A promise that resolves with the token data.
 */
declare function getToken(tokenOptions: TokenOptions): Promise<TokenData>;
export { getToken, TokenData };
