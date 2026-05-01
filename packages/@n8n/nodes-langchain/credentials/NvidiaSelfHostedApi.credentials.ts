import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NvidiaSelfHostedApi implements ICredentialType {
	name = 'nvidiaSelfHostedApi';

	displayName = 'NVIDIA Nemotron (Self-Hosted NIM)';

	documentationUrl = 'nvidia';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'http://localhost:8000/v1',
			description:
				'OpenAI-compatible base URL of your self-hosted NVIDIA NIM container, including the /v1 path',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
			description: 'Optional. Leave blank if your NIM container does not require authentication',
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
			url: '/models',
		},
	};
}
