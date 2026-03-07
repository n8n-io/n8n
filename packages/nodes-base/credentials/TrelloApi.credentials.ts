import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class TrelloApi implements ICredentialType {
	name = 'trelloApi';

	displayName = 'Trello API';

	documentationUrl = 'trello';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'OAuth Secret (Application Secret)',
			name: 'oauthSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Application Secret for webhook signature verification. Found at https://trello.com/power-ups/admin under API Key tab. This is the same as the OAuth1.0 secret and is required for webhook signature validation.',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.qs = {
			...requestOptions.qs,
			key: credentials.apiKey,
			token: credentials.apiToken,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.trello.com',
			url: '=/1/tokens/{{$credentials.apiToken}}/member',
		},
	};
}
