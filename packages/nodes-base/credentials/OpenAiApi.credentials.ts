import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class OpenAiApi implements ICredentialType {
	name = 'openAiApi';

	displayName = 'OpenAi';

	documentationUrl = 'openai';

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
			displayName: 'Organization ID (optional)',
			name: 'organizationId',
			type: 'string',
			default: '',
			hint: 'Only required if you belong to multiple organisations',
			description:
				"For users who belong to multiple organizations, you can set which organization is used for an API request. Usage from these API requests will count against the specified organization's subscription quota.",
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: 'https://api.openai.com/v1',
			description: 'Override the default base URL for the API',
		},
		{
			displayName: 'Custom Headers',
			name: 'customHeaders',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			placeholder: 'Add Header',
			description: 'Custom HTTP headers to include with requests (useful for vLLM instances behind security proxies like Akamai or Cloudflare)',
			options: [
				{
					name: 'headers',
					displayName: 'Header',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: 'X-Client-ID',
							description: 'Header name',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							typeOptions: {
								password: true,
							},
							default: '',
							description: 'Header value',
						},
					],
				},
			],
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/models',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};

		requestOptions.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
		requestOptions.headers['OpenAI-Organization'] = credentials.organizationId;

		// Collect all custom headers (legacy + new)
		const headersToApply: Array<{ name: string; value: string }> = [];

		// Legacy single header support (backward compatibility)
		// If legacy header exists, automatically migrate it to new format
		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			headersToApply.push({
				name: credentials.headerName,
				value: credentials.headerValue,
			});
		}

		// New multiple custom headers support
		if (credentials.customHeaders && typeof credentials.customHeaders === 'object') {
			const customHeaders = credentials.customHeaders as {
				headers?: Array<{ name: string; value: string }>;
			};
			if (Array.isArray(customHeaders.headers)) {
				headersToApply.push(...customHeaders.headers);
			}
		}

		// Apply all collected headers
		for (const header of headersToApply) {
			if (header.name && typeof header.name === 'string' && header.value) {
				requestOptions.headers[header.name] = header.value;
			}
		}

		return requestOptions;
	}
}
