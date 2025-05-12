import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AnthropicApi implements ICredentialType {
	name = 'anthropicApi';

	displayName = 'Anthropic';

	documentationUrl = 'anthropic';

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
			type: 'string',
			default: 'https://api.anthropic.com',
			description: 'Override the default base URL for the API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/v1/messages',
			method: 'POST',
			headers: {
				'anthropic-version': '2023-06-01',
			},
			body: {
				model: 'claude-3-haiku-20240307',
				messages: [{ role: 'user', content: 'Hey' }],
				max_tokens: 1,
			},
		},
	};
}
