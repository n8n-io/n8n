import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class UProcApi implements ICredentialType {
	name = 'uprocApi';

	displayName = 'uProc API';

	documentationUrl = 'uProc';

	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const token = Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString('base64');
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Basic ${token}`,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.uproc.io/api/v2',
			url: '/profile',
			method: 'GET',
		},
	};
}
