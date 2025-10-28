import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class BitbucketAccessTokenApi implements ICredentialType {
	name = 'bitbucketAccessTokenApi';

	displayName = 'Bitbucket Access Token API';

	documentationUrl = 'bitbuckettokenapi';

	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const encodedApiKey = Buffer.from(`${credentials.email}:${credentials.accessToken}`).toString(
			'base64',
		);
		if (!requestOptions.headers) {
			requestOptions.headers = {};
		}
		requestOptions.headers.Authorization = `Basic ${encodedApiKey}`;
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.bitbucket.org/2.0',
			url: '/user',
		},
	};
}
