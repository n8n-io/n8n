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
	documentationUrl = 'openAi';

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
			displayName: 'Add Custom Headers',
			name: 'useCustomHeaders',
			type: 'boolean',
			default: false,
			description: 'Whether to add custom headers to the requests',
		},
		{
			displayName: 'Custom Headers (JSON)',
			name: 'customHeaders',
			type: 'json',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
				},
			},
			default: '{}',
			description:
				'Custom headers to add to requests. Format: {"Header-Name": "value", "Another-Header": "value2"}',
			placeholder: '{\n  "X-Custom-Header": "value",\n  "X-Another-Header": "value2"\n}',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// Initialize headers with the Authorization
		requestOptions.headers = {
			Authorization: `Bearer ${credentials.apiKey}`,
		};

		// Add Organization ID if provided
		if (credentials.organizationId) {
			requestOptions.headers['OpenAI-Organization'] = credentials.organizationId as string;
		}

		// Only add custom headers if the toggle is enabled
		if (credentials.useCustomHeaders && credentials.customHeaders) {
			try {
				let customHeaders: Record<string, string>;

				// Handle if customHeaders is already an object or needs parsing
				if (typeof credentials.customHeaders === 'string') {
					customHeaders = JSON.parse(credentials.customHeaders);
				} else {
					customHeaders = credentials.customHeaders as Record<string, string>;
				}

				// Add each custom header to the request
				Object.entries(customHeaders).forEach(([name, value]) => {
					if (name && value) {
						requestOptions.headers![name] = value;
					}
				});
			} catch (error) {
				console.error('Failed to parse custom headers:', error);
			}
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/models',
		},
	};
}
