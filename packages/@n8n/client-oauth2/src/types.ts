export type Headers = Record<string, string | string[]>;

export type OAuth2GrantType = 'pkce' | 'authorizationCode' | 'clientCredentials';

export type OAuth2AuthenticationMethod = 'header' | 'body';

export interface OAuth2CredentialData {
	clientId: string;
	clientSecret?: string;
	accessTokenUrl: string;
	authentication?: OAuth2AuthenticationMethod;
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
	useDynamicClientRegistration?: boolean;
	serverUrl?: string;
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

/**
 * OAuth 2.0 Authorization Server Metadata
 * Based on RFC 8414: https://www.rfc-editor.org/rfc/rfc8414.html
 */
export interface OAuthAuthorizationServerMetadata {
	/** URL of the authorization server's authorization endpoint */
	authorization_endpoint: string;

	/** URL of the authorization server's token endpoint */
	token_endpoint: string;

	/** URL of the authorization server's dynamic client registration endpoint */
	registration_endpoint: string;

	/**
	 * Array of OAuth 2.0 grant type values supported
	 * If omitted, the default is ['authorization_code', 'implicit']
	 */
	grant_types_supported?: string[];

	/**
	 * Array of client authentication methods supported by the token endpoint
	 * If omitted, the default is ['client_secret_basic']
	 */
	token_endpoint_auth_methods_supported?: string[];

	/**
	 * Array of PKCE code challenge methods supported
	 * If omitted, the server does not support PKCE
	 */
	code_challenge_methods_supported?: string[];
}
