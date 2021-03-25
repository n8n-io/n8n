import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GithubApi implements ICredentialType {
	name = 'githubApi';
	displayName = 'Github API';
	documentationUrl = 'github';
	properties = [
		{
			displayName: 'Github Server',
			name: 'server',
			type: 'string' as NodePropertyTypes,
			default: 'https://api.github.com',
			description: 'The server to connect to. Does only have to get changed if Github Enterprise gets used.',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
