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
