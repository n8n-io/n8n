import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class ElasticApi implements ICredentialType {
	name = 'elasticApi';

	displayName = 'Elastic API';

	documentationUrl = 'elastic';

	icon = { light: 'file:icons/Elastic.svg', dark: 'file:icons/Elastic.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://mydeployment.kb.us-central1.gcp.cloud.es.io:9243',
			description: "Referred to as Kibana 'endpoint' in the Elastic deployment dashboard",
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			Authorization: 'ApiKey ' + credentials.apiKey,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/endpoint/metadata',
			method: 'GET',
		},
	};
}
