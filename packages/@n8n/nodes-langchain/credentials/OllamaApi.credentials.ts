import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
} from 'n8n-workflow';

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
		{
			displayName: 'API Key',
			hint: 'When using Ollama behind a proxy with authentication (such as Open WebUI), provide the Bearer token/API key here. This is not required for the default Ollama installation',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
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
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/api/tags',
			method: 'GET',
		},
	};
}
