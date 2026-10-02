import { compat, credential, credentialType, defineNode, str, t } from '@n8n/node-sdk';

const DEFAULT_SERVER = 'https://api.github.com';

export const githubToken = credentialType({
	id: 'github.token',
	legacyName: 'githubApi',
	displayName: 'GitHub API',
	docs: 'github',
	fields: {
		server: t
			.url('Github Server')
			.default(DEFAULT_SERVER)
			.describe('The server to connect to. Only has to be set if Github Enterprise is used.'),
		user: t.text('User').optional(),
		accessToken: t.secret('Access Token'),
	},
	baseUrl: '{server}',
	auth: (a) => a.header('Authorization', 'token {accessToken}'),
	test: { get: '/user' },
});

export const github = defineNode({
	id: 'github',
	displayName: 'GitHub',
	// The scopes are GitHub OAuth scopes. A token with fine-grained permissions maps to them.
	credential: credential({
		types: [
			githubToken,
			// The legacy type stays the definition: its OAuth2 endpoints depend on the server.
			compat('githubOAuth2Api', {
				id: 'github.oauth2',
				fields: { server: str().default(DEFAULT_SERVER) },
				baseUrl: '{server}',
			}),
		],
		scopes: {
			repo: 'Read and write repositories',
			'admin:repo_hook': 'Create and delete repository webhooks',
		},
	}),
});

export const repository = github.resource('repository', {
	input: {
		owner: str().hint('User or organization name'),
		repository: str().hint('Repository name, without the owner'),
	},
});

// The names go into the request path, so a name of only dots must not pass.
export const issueResource = github.resource('issue', {
	input: {
		owner: str()
			.with({ pattern: '^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$' })
			.hint('User or organization name, e.g. acme'),
		repository: str()
			.with({ pattern: '^(?!\\.{1,2}$)[A-Za-z0-9._-]+$' })
			.hint('Repository name without the owner, e.g. widgets'),
	},
});
