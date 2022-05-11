import {
	IAuthenticateQueryAuth,
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
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
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
		requestOptions.qs = {
			key: credentials.apiKey,
			token: credentials.apiToken,
			...requestOptions.qs,
		};
		console.log(requestOptions.qs);
		return requestOptions;
	}
}
