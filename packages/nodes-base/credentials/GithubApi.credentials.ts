import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GithubApi implements ICredentialType {
	name = 'githubApi';

	displayName = 'GitHub API';

	documentationUrl = 'github';

	properties: INodeProperties[] = [
		{
			displayName: 'Github Server',
			name: 'server',
			type: 'string',
			default: 'https://api.github.com',
			description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'GitHub Personal Access Token. Supports both classic tokens and fine-grained tokens. For GitHub Trigger webhooks, ensure your token has "repo" scope (classic) or "repository_hooks: write" permission (fine-grained).',
		},
	];

		authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{ ($credentials?.accessToken && typeof $credentials.accessToken === "string" && $credentials.accessToken.startsWith("github_pat_")) ? "Bearer " + $credentials.accessToken : "token " + ($credentials?.accessToken || "") }}',
			},
		},
	};	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.server}}',
			url: '/user',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'login',
					message: 'Invalid access token or insufficient permissions',
				},
			},
		],
	};
}
