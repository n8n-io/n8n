import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OllamaApi implements ICredentialType {
	name = 'ollamaApi';

	displayName = 'Ollama';

	documentationUrl = 'ollama';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			required: true,
			type: 'string',
			default: 'http://localhost:11434',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/api/generate',
			method: 'POST',
			headers: {
				'anthropic-version': '2023-06-01',
			},
			body: {
				model: 'llama2',
				prompt: 'Hello',
			},
		},
	};
}
