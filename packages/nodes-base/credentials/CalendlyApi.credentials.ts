import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class CalendlyApi implements ICredentialType {
	name = 'calendlyApi';

	displayName = 'Calendly Personal Access Token API';

	documentationUrl = 'calendly';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
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
		const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey : '';
		requestOptions.headers = requestOptions.headers ?? {};
		requestOptions.headers.Authorization = `Bearer ${apiKey}`;
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.calendly.com',
			url: '/users/me',
		},
	};
}
