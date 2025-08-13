import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDisplayOptions,
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
		// Header 1 - Always shown when custom headers are enabled
		{
			displayName: 'Header Name',
			name: 'header1Name',
			type: 'string',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
				},
			} as IDisplayOptions,
			default: '',
			placeholder: 'X-Custom-Header',
		},
		{
			displayName: 'Header Value',
			name: 'header1Value',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
				},
			} as IDisplayOptions,
			default: '',
		},
		{
			displayName: 'Add Another Header',
			name: 'addHeader2',
			type: 'boolean',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
				},
			} as IDisplayOptions,
			default: false,
		},
		// Header 2
		{
			displayName: 'Header Name',
			name: 'header2Name',
			type: 'string',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
				},
			} as IDisplayOptions,
			default: '',
			placeholder: 'X-Another-Header',
		},
		{
			displayName: 'Header Value',
			name: 'header2Value',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
				},
			} as IDisplayOptions,
			default: '',
		},
		{
			displayName: 'Add Another Header',
			name: 'addHeader3',
			type: 'boolean',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
				},
			} as IDisplayOptions,
			default: false,
		},
		// Header 3
		{
			displayName: 'Header Name',
			name: 'header3Name',
			type: 'string',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
				},
			} as IDisplayOptions,
			default: '',
			placeholder: 'X-Third-Header',
		},
		{
			displayName: 'Header Value',
			name: 'header3Value',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
				},
			} as IDisplayOptions,
			default: '',
		},
		{
			displayName: 'Add Another Header',
			name: 'addHeader4',
			type: 'boolean',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
				},
			} as IDisplayOptions,
			default: false,
		},
		// Header 4
		{
			displayName: 'Header Name',
			name: 'header4Name',
			type: 'string',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
					addHeader4: [true],
				},
			} as IDisplayOptions,
			default: '',
			placeholder: 'X-Fourth-Header',
		},
		{
			displayName: 'Header Value',
			name: 'header4Value',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
					addHeader4: [true],
				},
			} as IDisplayOptions,
			default: '',
		},
		{
			displayName: 'Add Another Header',
			name: 'addHeader5',
			type: 'boolean',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
					addHeader4: [true],
				},
			} as IDisplayOptions,
			default: false,
		},
		// Header 5
		{
			displayName: 'Header Name',
			name: 'header5Name',
			type: 'string',
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
					addHeader4: [true],
					addHeader5: [true],
				},
			} as IDisplayOptions,
			default: '',
			placeholder: 'X-Fifth-Header',
		},
		{
			displayName: 'Header Value',
			name: 'header5Value',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
					addHeader2: [true],
					addHeader3: [true],
					addHeader4: [true],
					addHeader5: [true],
				},
			} as IDisplayOptions,
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// Initialize headers with the API key
		requestOptions.headers = { 'api-key': credentials.apiKey };

		// Add custom headers if enabled
		if (credentials.useCustomHeaders) {
			// Check each potential header pair
			for (let i = 1; i <= 5; i++) {
				const headerName = credentials[`header${i}Name`] as string;
				const headerValue = credentials[`header${i}Value`] as string;

				if (headerName && headerValue) {
					requestOptions.headers[headerName] = headerValue;
				}
			}
		}

		return requestOptions;
	}
}
