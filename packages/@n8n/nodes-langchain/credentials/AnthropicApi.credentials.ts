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
			baseURL: 'https://api.anthropic.com',
			url: '/v1/complete',
			method: 'POST',
			headers: {
				'anthropic-version': '2023-06-01',
			},
			body: {
				model: 'claude-2',
				prompt: '\n\nHuman: Hello, world!\n\nAssistant:',
				max_tokens_to_sample: 256,
			},
		},
	};
}
