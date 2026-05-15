import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NvidiaApi implements ICredentialType {
	name = 'nvidiaApi';

	displayName = 'NVIDIA Nemotron';

	documentationUrl = 'nvidia';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			required: true,
			default: 'https://integrate.api.nvidia.com/v1',
			description:
				'Use the default for build.nvidia.com cloud, or change it to point at a self-hosted NIM container (e.g. http://localhost:8000/v1)',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
			description:
				'Required for build.nvidia.com cloud. Leave blank for a self-hosted NIM that does not require authentication',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization:
					'={{ $credentials.apiKey ? "Bearer " + $credentials.apiKey : undefined }}',
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
