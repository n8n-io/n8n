import {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class UtopianLabsApi implements ICredentialType {
	name = 'utopianLabsApi';
	displayName = 'Utopian Labs API';
	documentationUrl = 'https://docs.utopianlabs.ai/';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://integrations.utopianlabs.ai',
		},
		{
			displayName:
				'You can generate an API key on the <a href="https://portal.utopianlabs.ai/api-keys" target="_blank">API Keys</a> page in your Utopian Labs portal.',
			name: 'apiKeyNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.apiUrl}}',
			url: '/v1/n8n/me',
		},
	};
}
