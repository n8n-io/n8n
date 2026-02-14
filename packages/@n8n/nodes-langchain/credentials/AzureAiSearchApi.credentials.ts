import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
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
		},
	];

	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				'api-key': credentials.apiKey,
			},
		};
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.endpoint}}/indexes',
			url: '',
			method: 'GET',
			headers: {
				accept: 'application/json',
			},
			qs: {
				'api-version': '2024-07-01',
			},
		},
	};
}
