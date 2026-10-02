import { compat, credential, defineNode, str } from '@n8n/node-sdk';

// The legacy types stay the definition. Both hold the server of GitHub Enterprise.
const fields = { server: str().default('https://api.github.com') };

export const github = defineNode({
	id: 'github',
	displayName: 'GitHub',
	// The scopes are GitHub OAuth scopes. A token with fine-grained permissions maps to them.
	credential: credential({
		types: [
			compat('githubApi', { id: 'github.token', fields, baseUrl: '{server}' }),
			compat('githubOAuth2Api', { id: 'github.oauth2', fields, baseUrl: '{server}' }),
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
