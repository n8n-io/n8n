import {
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
			required: true,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'OAuth Secret',
			name: 'oauthSecret',
			type: 'string',
			default: '',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.qs = Object.assign(requestOptions.qs, {
			key: credentials.apiKey,
			token: credentials.apiToken,
		});
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.trello.com/1',
			url: '/members/me/boards',
		},
	};}
