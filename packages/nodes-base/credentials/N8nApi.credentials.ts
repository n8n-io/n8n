import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class N8nApi implements ICredentialType {
	name = 'n8nApi';
	displayName = 'n8n API';
	documentationUrl = 'n8nApi';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			description: 'The API key for the n8n instance',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://<name>.app.n8n.cloud/api/v1',
			description: 'The API URL of the n8n instance',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-N8N-API-KEY': '={{ $credentials.apiKey }}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/workflows?limit=5',
		},
	};
}
