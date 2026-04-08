import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ChromaCloudApi implements ICredentialType {
	name = 'chromaCloudApi';

	displayName = 'ChromaDB Cloud';

	documentationUrl = 'chroma';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Chroma Cloud API key',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenant',
			type: 'string',
			default: '',
			description: 'Optional: Tenant ID (auto-resolved if API key is scoped to single DB)',
		},
		{
			displayName: 'Database Name',
			name: 'database',
			type: 'string',
			default: '',
			description: 'Optional: Database name (auto-resolved if API key is scoped to single DB)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.trychroma.com',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-chroma-token': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v2',
			method: 'GET',
		},
	};
}
