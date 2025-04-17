import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class IterableApi implements ICredentialType {
	name = 'iterableApi';

	displayName = 'Iterable API';

	documentationUrl = 'iterable';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'EDC',
					value: 'https://api.eu.iterable.com',
				},
				{
					name: 'USDC',
					value: 'https://api.iterable.com',
				},
			],
			default: 'https://api.iterable.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Api_Key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.region}}',
			url: '/api/webhooks',
			method: 'GET',
		},
	};
}
