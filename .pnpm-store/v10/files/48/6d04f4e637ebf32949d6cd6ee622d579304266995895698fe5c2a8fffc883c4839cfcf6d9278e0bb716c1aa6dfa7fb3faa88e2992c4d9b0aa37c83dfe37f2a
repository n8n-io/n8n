export interface TokenSet {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}
/**
 * Refresh an OAuth access token using a refresh token
 */
export declare function refreshTokenRequest(options: {
    refresh_token: string;
}): Promise<Response>;
/**
 * Process the token response and extract the token set
 */
export declare function processTokenResponse(response: Response): Promise<[Error] | [null, TokenSet]>;
