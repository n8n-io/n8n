import { defineCredential, field } from '@n8n/node-sdk/credentials';

const DEFAULT_SERVER = 'https://api.github.com';

const server = field
	.url('Github Server')
	.default(DEFAULT_SERVER)
	.describe('The server to connect to. Only has to be set if Github Enterprise is used.');

export const githubToken = defineCredential({
	id: 'github.token',
	version: '1.0.0',
	legacyName: 'githubApi',
	displayName: 'GitHub API',
	docs: 'github',
	fields: {
		server,
		user: field.text('User').optional(),
		accessToken: field.secret('Access Token'),
	},
	baseUrl: '{server}',
	auth: (a) => a.header('Authorization', 'token {accessToken}'),
	test: { get: '/user' },
});

const OAUTH_SCOPES = [
	'repo',
	'admin:repo_hook',
	'admin:org',
	'admin:org_hook',
	'gist',
	'notifications',
	'user',
	'write:packages',
	'read:packages',
	'delete:packages',
	'workflow',
];

export const githubOAuth2 = defineCredential({
	id: 'github.oauth2',
	version: '1.0.0',
	legacyName: 'githubOAuth2Api',
	displayName: 'GitHub OAuth2 API',
	docs: 'github',
	fields: { server },
	baseUrl: '{server}',
	auth: (a) =>
		a.oauth2.authorizationCode({
			authorizationEndpoint: 'https://github.com/login/oauth/authorize',
			tokenEndpoint: 'https://github.com/login/oauth/access_token',
			scope: OAUTH_SCOPES,
			pkce: false,
		}),
	// The OAuth endpoints are on the web host of the server, not on its API host.
	derive: ({ server: url }) => {
		const { host, origin } = new URL(url);
		const web = host === 'api.github.com' ? 'https://github.com' : origin;
		return {
			authorizationEndpoint: `${web}/login/oauth/authorize`,
			tokenEndpoint: `${web}/login/oauth/access_token`,
			// GitHub documents the comma-separated form, which the legacy type sends.
			scope: OAUTH_SCOPES.join(','),
		};
	},
});
