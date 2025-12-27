import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ChromaSelfHostedApi implements ICredentialType {
	name = 'chromaSelfHostedApi';

	displayName = 'ChromaDB Self-Hosted';

	documentationUrl = 'chroma';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:8000',
			placeholder: 'http://localhost:8000',
			description: 'The URL of your ChromaDB instance',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Token',
					value: 'token',
				},
			],
			default: 'none',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authentication: ['token'],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization:
					'={{$credentials.authentication === "apiKey" && $credentials.apiKey ? "Bearer " + $credentials.apiKey : ""}}',
				'X-Chroma-Token':
					'={{$credentials.authentication === "token" && $credentials.token ? $credentials.token : ""}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v2/heartbeat',
			method: 'GET',
		},
	};
}
