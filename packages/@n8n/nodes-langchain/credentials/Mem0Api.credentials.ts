import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Mem0Api implements ICredentialType {
	name = 'mem0Api';

	displayName = 'Mem0 API';

	documentationUrl = 'https://docs.mem0.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Custom API URL',
			name: 'useCustomApiUrl',
			description: 'Whether to use a custom API URL instead of the default one',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			required: false,
			type: 'string',
			default: 'https://api.mem0.ai/v1',
			description: 'URL of the Mem0 API',
			displayOptions: {
				show: {
					useCustomApiUrl: [true],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{`Token ${$credentials.apiKey}`}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.useCustomApiUrl ? $credentials.apiUrl : "https://api.mem0.ai/v1"}}',
			url: '/memories/search/',
			method: 'POST',
			body: {
				query: 'test',
				user_id: 'test_user',
			},
		},
	};
}
