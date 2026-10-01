import { compat, credential, defineNode, str } from '@n8n/node-sdk';

// The legacy types stay the definition. Both hold the server of GitHub Enterprise.
const server = str().default('https://api.github.com');
const serverUrl = ({ server: url }: { server: string }) => url || 'https://api.github.com';

export const github = defineNode({
	id: 'github',
	displayName: 'GitHub',
	// The scopes are GitHub OAuth scopes. A token with fine-grained permissions maps to them.
	credential: credential({
		types: [
			compat('githubApi', { fields: { server }, baseUrl: serverUrl }),
			compat('githubOAuth2Api', { fields: { server }, baseUrl: serverUrl }),
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
