import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class ElasticsearchApi implements ICredentialType {
	name = 'elasticsearchApi';

	displayName = 'Elasticsearch API';

	documentationUrl = 'elasticsearch';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://mydeployment.es.us-central1.gcp.cloud.es.io:9243',
			description: "Referred to as Elasticsearch 'endpoint' in the Elastic deployment dashboard",
			required: true,
		},
		{
			displayName: 'Authentication Type',
			name: 'authType',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
			description: 'API key for Elasticsearch Serverless and Cloud instances',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authType: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authType: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (credentials.authType === 'basicAuth') {
			requestOptions.auth = {
				username: credentials.username as string,
				password: credentials.password as string,
			};
		} else {
			// Default to API Key authentication
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `ApiKey ${credentials.apiKey}`,
			};
		}
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials.ignoreSSLIssues}}',
		},
	};
}
