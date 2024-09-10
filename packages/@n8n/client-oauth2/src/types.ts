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
	grantType: OAuth2GrantType;
	ignoreSSLIssues?: boolean;
	oauthTokenData?: {
		access_token: string;
		refresh_token?: string;
	};
}
