import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
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

	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		if (!credentials.apiKey) {
			return requestOptions;
		}
		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${credentials.apiKey as string}`,
			},
		};
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.url }}',
			url: '/models',
		},
	};
}
