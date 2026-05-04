import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class GravityZoneApi implements ICredentialType {
	name = 'gravityZoneApi';

	displayName = 'Bitdefender GravityZone API';

	documentationUrl = 'https://www.bitdefender.com/business/support/en/77212-125277-public-api.html';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://cloud.gravityzone.bitdefender.com/api',
			required: true,
			description: 'The base URL for the GravityZone API',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
			description:
				'The API key generated in the MyAccount section of the GravityZone Control Center',
		},
	];

	// eslint-disable-next-line @typescript-eslint/require-await
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const apiKey = credentials.apiKey as string;

		const encoded = Buffer.from(`${apiKey}:`).toString('base64');

		requestOptions.headers = {
			...requestOptions.headers,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: `Basic ${encoded}`,
		};

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: '={{$credentials.apiUrl}}',
			url: '/v1.0/jsonrpc/general',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: 'credential-test',
				jsonrpc: '2.0',
				method: 'getApiKeyDetails',
				params: {},
			}),
		},
	};
}
