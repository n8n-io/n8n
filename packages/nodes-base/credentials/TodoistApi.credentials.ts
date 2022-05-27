import {
	IAuthenticateBearer,
	ICredentialTestRequest,
	ICredentialType,
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

	authenticate = {
		type: 'bearer',
		properties: {
			tokenPropertyName: 'apiKey',
		},
	} as IAuthenticateBearer;

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.todoist.com/rest/v1',
			url: '/labels',
		},
	};
}
