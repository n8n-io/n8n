import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GitlabApi implements ICredentialType {
	name = 'gitlabApi';
	displayName = 'GitLab API';
	documentationUrl = 'gitlab';
	properties: INodeProperties[] = [
		{
			displayName: 'Gitlab Server',
			name: 'server',
			type: 'string',
			default: 'https://gitlab.com',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Private-Token': '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.server.replace(new RegExp("/$"), "") + "/api/v4" }}',
			url: '/users',
		},
	};
}
