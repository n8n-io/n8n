import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class AzureAiSearchApi implements ICredentialType {
	name = 'azureAiSearchApi';

	displayName = 'Azure AI Search API';

	documentationUrl = 'azureaisearch';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Method',
			name: 'authType',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Managed Identity (System-Assigned)',
					value: 'managedIdentitySystem',
				},
				{
					name: 'Managed Identity (User-Assigned)',
					value: 'managedIdentityUser',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'Search Endpoint',
			name: 'endpoint',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://your-search-service.search.windows.net',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'managedIdentityClientId',
			type: 'string',
			required: true,
			default: '',
			description: 'Client ID of the user-assigned managed identity',
			displayOptions: {
				show: {
					authType: ['managedIdentityUser'],
				},
			},
		},
	];

	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		const authType = credentials.authType || 'apiKey';

		// Only add API key header for API key authentication
		if (authType === 'apiKey') {
			return {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					'api-key': credentials.apiKey,
				},
			};
		}

		// For managed identity, don't add any auth headers
		// The Azure SDK will handle authentication internally
		return requestOptions;
	};
}
