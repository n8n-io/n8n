import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class QdrantApi implements ICredentialType {
	name = 'qdrantApi';

	displayName = 'Qdrant Api';

	documentationUrl = 'qdrant';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			required: true,
			type: 'string',
			default: 'http://localhost:6333',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Api-Key': '={{$credentials.apiKey ? $credentials.apiKey : undefined }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/collections',
		},
	};
}
