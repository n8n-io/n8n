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
			displayName: 'OAuth Secret',
			name: 'oauthSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The OAuth secret used to verify webhook signatures. Find it on your <a href="https://trello.com/power-ups/admin" target="_blank">Power-Up admin page</a> under "API Key".',
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
