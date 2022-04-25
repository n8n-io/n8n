import {
	IAuthenticateBasicAuth,
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
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.apiKey}`;
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.todoist.com',
			url: '/rest/v1/projects',
		},
	};

}
