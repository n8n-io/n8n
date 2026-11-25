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
		{
			displayName: 'CA Certificate',
			name: 'ca',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'PEM-encoded CA certificate(s) used to verify the registry. This replaces the certificate authorities that n8n trusts by default rather than adding to them, so include every CA the registry chain needs. Leave empty to use the default authorities. The registry URL must use https when this field is set. The credential test below does not use it.',
		},
		{
			displayName: 'Client Certificate',
			name: 'cert',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'PEM-encoded client certificate for mutual TLS (mTLS). Provide together with the client private key. The registry URL must use https when this field is set. The credential test below does not use it.',
		},
		{
			displayName: 'Client Private Key',
			name: 'key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'PEM-encoded client private key for mutual TLS (mTLS). Provide together with the client certificate. The registry URL must use https when this field is set. The credential test below does not use it.',
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
			const { username, password } = credentials;
			// Only send credentials when both fields are filled in; credentials
			// created via the public API may have empty fields
			if (
				typeof username === 'string' &&
				username !== '' &&
				typeof password === 'string' &&
				password !== ''
			) {
				requestOptions.auth = { username, password };
			}
		}
		return requestOptions;
	}

	// This goes through n8n's HTTP helper, which carries no TLS material, so the test uses
	// the default certificate authorities and sends no client certificate. A registry that
	// needs either fails here and still works on the node. See ENT-842.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/subjects',
		},
	};
}
