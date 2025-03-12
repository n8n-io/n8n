import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PerplexityApi implements ICredentialType {
	name = 'perplexityApi';

	displayName = 'Perplexity API';

	documentationUrl = 'https://docs.perplexity.ai/api-reference/chat-completions';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your Perplexity API key. Get it from your Perplexity account.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.perplexity.ai',
			description: 'The base URL for the Perplexity API.',
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
			baseURL: '={{$credentials.baseUrl}}',
			url: '/chat/completions',
			method: 'POST',
			body: {
				model: 'r1-1776',
				messages: [{ role: 'user', content: 'test' }],
			},
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'Content-Type': 'application/json',
			},
			json: true,
		},
	};
}
