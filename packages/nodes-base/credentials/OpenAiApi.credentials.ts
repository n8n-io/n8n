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
			type: 'json',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			default: '{}',
			placeholder: '{ "X-Client-ID": "your-client-id", "X-Secret-ID": "your-secret-id" }',
			description: 'Custom HTTP headers as JSON object. Useful for vLLM instances behind security proxies like Akamai or Cloudflare that require multiple authentication headers.',
			hint: 'Enter headers as a JSON object with header names as keys and values as strings',
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

		// Legacy single header support (backward compatibility)
		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			requestOptions.headers[credentials.headerName] = credentials.headerValue;
		}

		// New JSON-based custom headers support
		if (credentials.customHeaders) {
			try {
				let customHeaders: Record<string, string> = {};

				// Handle different formats of customHeaders
				if (typeof credentials.customHeaders === 'string') {
					// Parse JSON string
					const parsed = JSON.parse(credentials.customHeaders);
					if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
						customHeaders = parsed;
					}
				} else if (typeof credentials.customHeaders === 'object' && credentials.customHeaders !== null) {
					// Handle legacy fixedCollection format for backward compatibility
					const legacyFormat = credentials.customHeaders as {
						headers?: Array<{ name: string; value: string }>;
					};
					if (Array.isArray(legacyFormat.headers)) {
						// Convert array format to object format
						for (const header of legacyFormat.headers) {
							if (header.name && typeof header.name === 'string' && header.value) {
								customHeaders[header.name] = header.value;
							}
						}
					} else {
						// Direct object format
						customHeaders = credentials.customHeaders as Record<string, string>;
					}
				}

				// Apply all custom headers
				for (const [headerName, headerValue] of Object.entries(customHeaders)) {
					if (headerName && typeof headerName === 'string' && headerValue) {
						requestOptions.headers[headerName] = String(headerValue);
					}
				}
			} catch (error) {
				// Silently ignore JSON parsing errors to maintain backward compatibility
			}
		}

		return requestOptions;
	}
}
