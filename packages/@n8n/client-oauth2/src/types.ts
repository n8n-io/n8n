export type Headers = Record<string, string | string[]>;

export type OAuth2GrantType = 'pkce' | 'authorizationCode' | 'clientCredentials';

export interface OAuth2CredentialData {
	clientId: string;
	clientSecret?: string;
	accessTokenUrl: string;
	authentication?: 'header' | 'body';
	authUrl?: string;
	scope?: string;
	authQueryParameters?: string;
	additionalBodyProperties?: string;
	grantType: OAuth2GrantType;
	ignoreSSLIssues?: boolean;
	oauthTokenData?: {
		access_token: string;
		refresh_token?: string;
	};
}

/**
 * The response from the OAuth2 server when the access token is not successfully
 * retrieved. As specified in RFC 6749 Section 5.2:
 * https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
 */
export interface OAuth2AccessTokenErrorResponse extends Record<string, unknown> {
	error: string;
	error_description?: string;
	error_uri?: string;
}
