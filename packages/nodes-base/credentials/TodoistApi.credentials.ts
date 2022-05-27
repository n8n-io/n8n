import {
	IAuthenticateHeaderAuth,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';


export class TodoistApi implements ICredentialType {
	name = 'todoistApi';
	displayName = 'Todoist API';
	documentationUrl = 'todoist';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			'authorization': `Bearer ${credentials.apiKey}`,
		};
		if (requestOptions.body && Object.keys(requestOptions.body).length === 0) {
			delete requestOptions.body;
		}
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.todoist.com/rest/v1',
			url: '/labels',
		},
	};
}
