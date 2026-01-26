import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
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
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: 'https://api.anthropic.com',
			description: 'Override the default base URL for the API',
		},
		{
			displayName: 'Add Custom Header',
			name: 'header',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/v1/messages',
			method: 'POST',
			headers: {
				'anthropic-version': '2023-06-01',
			},
			body: {
				model: 'claude-3-haiku-20240307',
				messages: [{ role: 'user', content: 'Hey' }],
				max_tokens: 1,
			},
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};

		requestOptions.headers['x-api-key'] = credentials.apiKey;

		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			requestOptions.headers[credentials.headerName] = credentials.headerValue;
		}

		return requestOptions;
	}
}
