import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

export type LemonadeApiCredentialsType = {
	baseUrl: string;
	apiKey?: string;
};

export class LemonadeApi implements ICredentialType {
	name = 'lemonadeApi';

	displayName = 'Lemonade';

	documentationUrl = 'lemonade';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			required: true,
			type: 'string',
			default: 'http://localhost:8000/api/v1',
		},
		{
			displayName: 'API Key',
			hint: 'Optional API key for Lemonade server authentication. Not required for default Lemonade installation',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// Only add Authorization header if API key is provided and not empty
		const apiKey = credentials.apiKey as string | undefined;
		if (apiKey && apiKey.trim() !== '') {
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `Bearer ${apiKey}`,
			};
		}
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/models',
			method: 'GET',
		},
	};
}
