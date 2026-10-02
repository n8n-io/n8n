import { credentialType, t } from '@n8n/node-sdk';

const baseUrl = 'https://api.notion.com/v1';

export const notionToken = credentialType({
	id: 'notion.token',
	legacyName: 'notionApi',
	displayName: 'Notion API',
	docs: 'notion',
	fields: { apiKey: t.secret('Internal Integration Secret') },
	baseUrl,
	auth: (a) => a.bearer('apiKey', { defaults: { 'Notion-Version': '2022-02-22' } }),
	test: { get: '/users/me' },
});

export const notionOAuth2 = credentialType({
	id: 'notion.oauth2',
	legacyName: 'notionOAuth2Api',
	displayName: 'Notion OAuth2 API',
	docs: 'notion',
	baseUrl,
	// The legacy type has no PKCE.
	auth: (a) =>
		a.oauth2.authorizationCode({
			authorizationEndpoint: 'https://api.notion.com/v1/oauth/authorize',
			tokenEndpoint: 'https://api.notion.com/v1/oauth/token',
			clientAuth: 'client_secret_basic',
			pkce: false,
		}),
});
