import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CohereApi implements ICredentialType {
	name = 'cohereApi';

	displayName = 'CohereApi';

	documentationUrl = 'cohere';

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
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default: 'https://api.cohere.ai',
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
			baseURL: '={{ $credentials.url }}',
			url: '/v1/models?page_size=1',
		},
	};
}
