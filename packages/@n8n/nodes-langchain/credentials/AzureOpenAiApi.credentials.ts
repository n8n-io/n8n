import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class AzureOpenAiApi implements ICredentialType {
	name = 'azureOpenAiApi';
	displayName = 'Azure Open AI';
	documentationUrl = 'azureopenai';
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
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: undefined,
			placeholder: 'https://westeurope.api.cognitive.microsoft.com',
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
		// Initialize headers with the API key
		requestOptions.headers = { 'api-key': credentials.apiKey };

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
				// Continue without custom headers if parsing fails
			}
		}

		return requestOptions;
	}
}
