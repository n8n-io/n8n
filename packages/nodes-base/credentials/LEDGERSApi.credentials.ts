import type {
	ICredentialType,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class LEDGERSApi implements ICredentialType {
	name = 'ledgersApi';

	displayName = 'LEDGERS API';

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'X-API-Key',
			name: 'xApiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			required: true,
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
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			'Content-Type': 'application/json',
			'x-api-key': credentials.xApiKey as string,
		};
		requestOptions.body = {
			email: credentials.email,
			password: credentials.password,
		};
		return requestOptions;
	}
}
