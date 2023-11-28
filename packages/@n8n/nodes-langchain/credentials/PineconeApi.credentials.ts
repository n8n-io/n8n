import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PineconeApi implements ICredentialType {
	name = 'pineconeApi';

	displayName = 'PineconeApi';

	documentationUrl = 'pinecone';

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
			displayName: 'Environment',
			name: 'environment',
			type: 'string',
			required: true,
			default: 'us-central1-gcp',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://controller.{{$credentials.environment}}.pinecone.io/databases',
			headers: {
				accept: 'application/json; charset=utf-8',
			},
		},
	};
}
