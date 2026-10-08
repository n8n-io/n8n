import { defineCredential, field } from '@n8n/node-sdk/credentials';

const DEFAULT_SERVER = 'https://api.github.com';

export const githubToken = defineCredential({
	id: 'github.token',
	version: '1.0.0',
	legacyName: 'githubApi',
	displayName: 'GitHub API',
	docs: 'github',
	fields: {
		server: field
			.url('Github Server')
			.default(DEFAULT_SERVER)
			.describe('The server to connect to. Only has to be set if Github Enterprise is used.'),
		user: field.text('User').optional(),
		accessToken: field.secret('Access Token'),
	},
	baseUrl: '{server}',
	auth: (a) => a.header('Authorization', 'token {accessToken}'),
	test: { get: '/user' },
});
