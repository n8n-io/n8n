import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class SchemaRegistryApi implements ICredentialType {
	name = 'schemaRegistryApi';

	displayName = 'Schema Registry';

	documentationUrl = 'schemaregistry';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://schema-registry-domain:8081',
			description: 'URL of the schema registry',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Basic Auth',
					value: 'basicAuth',
					description:
						'Username and password, e.g. a Confluent Cloud Schema Registry API key and secret',
				},
				{
					name: 'None',
					value: 'none',
				},
			],
			default: 'basicAuth',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Username or Confluent Cloud API key',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
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
			description: 'Password or Confluent Cloud API secret',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
		},
	];

	/**
	 * Backs the credential test request and generic HTTP reuse (e.g. the HTTP
	 * Request node) only. The Kafka nodes authenticate against the registry
	 * through the `SchemaRegistry` client constructor, not this function.
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (credentials.authentication === 'basicAuth') {
			const username = typeof credentials.username === 'string' ? credentials.username : '';
			const password = typeof credentials.password === 'string' ? credentials.password : '';
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
			};
		}
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/subjects',
		},
	};
}
