export type Headers = Record<string, string | string[]>;

export type OAuth2GrantType = 'pkce' | 'authorizationCode' | 'clientCredentials';

/** How the secret is transmitted on the token request (RFC 6749 §2.3.1). */
export type OAuth2AuthenticationMethod = 'header' | 'body';

/**
 * Which credential the client presents to prove its identity: a shared secret, or
 * a certificate (private_key_jwt, RFC 7521/7523). Distinct from
 * `OAuth2AuthenticationMethod`, which only controls where the secret is placed.
 */
export type OAuth2ClientCredentialType = 'clientSecret' | 'certificate';

/** Certificate (private_key_jwt) client authentication, an alternative to `clientSecret`. */
export interface ClientCertificate {
	privateKey: string;
	certificate: string;
}

export interface OAuth2CredentialData {
	clientId: string;
	clientCredentialType?: OAuth2ClientCredentialType;
	clientSecret?: string;
	privateKey?: string;
	certificate?: string;
	accessTokenUrl: string;
	authentication?: OAuth2AuthenticationMethod;
	authUrl?: string;
	scope?: string;
	authQueryParameters?: string;
	additionalBodyProperties?: string;
	grantType: OAuth2GrantType;
	ignoreSSLIssues?: boolean;
	tokenExpiredStatusCode?: number;
	oauthTokenData?: {
		access_token: string;
		refresh_token?: string;
		resource?: string;
	};
	useDynamicClientRegistration?: boolean;
	serverUrl?: string;
	/*
	 * Resource indicator lifecycle:
	 * - `resourceUrl`       – raw user input from the credential form (optional override)
	 * - `resource`          – resolved value after discovery / validation, ephemeral for auth URI generation
	 * - `oauthTokenData.resource` – persisted with tokens so it can be re‑sent on refresh
	 */
	resourceUrl?: string;
	jweEnabled?: boolean;
	/**
	 * The resolved RFC 8707 resource indicator, set after discovery/validation.
	 * Populated from either the discovered metadata or the user's resourceUrl override.
	 */
	resource?: string;
	inlineJwks?: boolean;
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
