import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DeepinfraApi implements ICredentialType {
	name = 'deepinfraApi';

	displayName = 'Deepinfra';

	documentationUrl = 'deepinfra';

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
				'Authorization': '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.deepinfra.com',
			url: '/v1/openai/chat/completions',
			method: 'POST',
			body: {
				model: 'meta-llama/Llama-3.3-70B-Instruct',
				messages: [{ role: 'user', content: 'Respond in one word' }],
				max_tokens: 1,
			},
		},
	};
}
