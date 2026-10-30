import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

import { readCustomModelEndpointCredential } from '../utils/custom-model-endpoint/credential-data';
import { buildRequestHeaders, toHeaderRecord } from '../utils/custom-model-endpoint/headers';

export class CustomModelEndpointApi implements ICredentialType {
	name = 'customModelEndpointApi';

	displayName = 'Custom Model Endpoint';

	documentationUrl = 'custommodelendpoint';

	icon: Icon = {
		light: 'file:icons/customModelEndpoint.svg',
		dark: 'file:icons/customModelEndpoint.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://my-gateway.example.com/v1',
			description:
				'The root URL of the OpenAI-compatible API. n8n adds the paths, such as /chat/completions, to it.',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Bearer Token',
					value: 'bearer',
					description: 'Send the key as "Authorization: Bearer <key>"',
				},
				{
					name: 'API Key in Header',
					value: 'header',
					description: 'Send the key in a header with a name that you choose',
				},
				{
					name: 'Basic Auth',
					value: 'basic',
					description: 'Send a user name and a password',
				},
				{
					name: 'OAuth2 Client Credentials',
					value: 'oauth2',
					description: 'Sign in to a login server and send the token it returns',
				},
				{
					name: 'None',
					value: 'none',
					description: 'Send no login',
				},
			],
			default: 'bearer',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			displayOptions: { show: { authentication: ['bearer', 'header'] } },
		},
		{
			displayName: 'Header Name',
			name: 'authHeaderName',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'Ocp-Apim-Subscription-Key',
			description: 'The name of the header that carries the key',
			displayOptions: { show: { authentication: ['header'] } },
		},
		{
			displayName: 'Header Value Prefix',
			name: 'authHeaderPrefix',
			type: 'string',
			default: '',
			placeholder: 'e.g. Token',
			description:
				'Text that n8n puts before the key, followed by one space. Leave it empty to send the key alone.',
			displayOptions: { show: { authentication: ['header'] } },
		},
		{
			displayName: 'User Name',
			name: 'username',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { authentication: ['basic'] } },
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authentication: ['basic'] } },
		},
		{
			displayName: 'Token URL',
			name: 'tokenUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://login.example.com/oauth2/token',
			description:
				'Where n8n asks for an access token. Add this host to Allowed Domains as well, because it is not the base URL.',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
			placeholder: 'e.g. models.read',
			description: 'Space-separated scopes to ask for. Leave empty to ask for none.',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			displayName: 'Send Client Credentials In',
			name: 'sendCredentialsIn',
			type: 'options',
			options: [
				{
					name: 'Authorization Header',
					value: 'header',
					description: 'Send the client ID and secret as Basic auth',
				},
				{
					name: 'Request Body',
					value: 'body',
					description: 'Send the client ID and secret as body fields',
				},
			],
			default: 'header',
			displayOptions: { show: { authentication: ['oauth2'] } },
		},
		{
			displayName: 'Gateway Headers',
			name: 'gatewayHeaders',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			placeholder: 'Add Header',
			default: {},
			description:
				'Headers that n8n sends on every request to this endpoint, including the model list. The values are secret and fixed.',
			options: [
				{
					displayName: 'Header',
					name: 'headers',
					values: [
						{ displayName: 'Name', name: 'name', type: 'string', default: '' },
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							typeOptions: { password: true },
							default: '',
						},
					],
				},
			],
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = buildRequestHeaders({
			endpoint: readCustomModelEndpointCredential(credentials),
			requestHeaders: toHeaderRecord(requestOptions.headers),
		});
		return requestOptions;
	}
}
