import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import { requestClientCredentialsToken } from './common/client-credentials';

export class SchemaRegistryApi implements ICredentialType {
	name = 'schemaRegistryApi';

	displayName = 'Schema Registry';

	documentationUrl = 'schemaregistry';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
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
					name: 'OAuth2 Client Credentials',
					value: 'oAuth2ClientCredentials',
					description:
						'Bearer token minted from a token endpoint, e.g. Confluent Platform 7.7 and later behind an identity provider',
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
			displayName: 'Token URL',
			name: 'tokenUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://idp.example.com/oauth2/v1/token',
			description: 'Token endpoint that issues the bearer token for the registry',
			displayOptions: {
				show: {
					authentication: ['oAuth2ClientCredentials'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2ClientCredentials'],
				},
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2ClientCredentials'],
				},
			},
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
			description: 'Space-separated scopes to request. Leave empty to request none.',
			displayOptions: {
				show: {
					authentication: ['oAuth2ClientCredentials'],
				},
			},
		},
	];

	async preAuthentication(credentials: ICredentialDataDecryptedObject) {
		if (credentials.authentication !== 'oAuth2ClientCredentials') return {};

		const { accessToken } = await requestClientCredentialsToken(credentials);
		return { accessToken };
	}

	/**
	 * Backs the credential test request and generic HTTP reuse (e.g. the HTTP
	 * Request node) only. The Kafka nodes authenticate against the registry
	 * through the `SchemaRegistry` client constructor, not this function.
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (credentials.authentication === 'oAuth2ClientCredentials') {
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `Bearer ${credentials.accessToken as string}`,
			};
		}

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

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/subjects',
		},
	};
}
