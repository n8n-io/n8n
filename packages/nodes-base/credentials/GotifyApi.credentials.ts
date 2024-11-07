import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class GotifyApi implements ICredentialType {
	name = 'gotifyApi';

	displayName = 'Gotify API';

	documentationUrl = 'gotify';

	properties: INodeProperties[] = [
		{
			displayName: 'App API Token',
			name: 'appApiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: '(Optional) Needed for message creation',
		},
		{
			displayName: 'Client API Token',
			name: 'clientApiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: '(Optional) Needed for everything (delete, getAll) but message creation',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			description: 'The URL of the Gotify host',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const { appApiToken, clientApiToken } = credentials as {
			appApiToken: string;
			clientApiToken: string;
		};
		requestOptions.headers = {
			'X-Gotify-Key': requestOptions.method === 'POST' ? appApiToken : clientApiToken,
			accept: 'application/json',
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "") }}',
			url: '/current/user',
			skipSslCertificateValidation: '={{$credentials.ignoreSSLIssues}}',
		},
	};
}
