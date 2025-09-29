import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PerplexityApi implements ICredentialType {
	name = 'perplexityApi';

	displayName = 'Perplexity API';

	documentationUrl = 'perplexity';

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
			baseURL: 'https://api.perplexity.ai',
			url: '/chat/completions',
			method: 'POST',
			body: {
				model: 'sonar',
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
