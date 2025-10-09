import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JinaAiApi implements ICredentialType {
	name = 'jinaAiApi';

	displayName = 'Jina AI API';

	documentationUrl = 'jinaai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{ $credentials?.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: 'https://embeddings-dashboard-api.jina.ai/api/v1/api_key/fe_user',
			qs: {
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};
}
