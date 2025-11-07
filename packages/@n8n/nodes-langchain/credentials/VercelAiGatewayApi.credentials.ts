import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VercelAiGatewayApi implements ICredentialType {
	name = 'vercelAiGatewayApi';

	displayName = 'Vercel AI Gateway';

	documentationUrl = 'vercelaigateway';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key or OIDC Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your credentials for the Vercel AI Gateway',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			required: true,
			default: 'https://ai-gateway.vercel.sh/v1',
			description: 'The base URL for your Vercel AI Gateway instance',
			placeholder: 'https://ai-gateway.vercel.sh/v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'http-referer': 'https://n8n.io/',
				'x-title': 'n8n',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.url }}',
			url: '/chat/completions',
			method: 'POST',
			headers: {
				'http-referer': 'https://n8n.io/',
				'x-title': 'n8n',
			},
			body: {
				model: 'openai/gpt-4.1-nano',
				messages: [{ role: 'user', content: 'test' }],
				max_tokens: 1,
			},
		},
	};
}
