import {
	IAuthenticateQueryAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CalApi implements ICredentialType {
	name = 'calApi';
	displayName = 'Cal API';
	documentationUrl = 'cal';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://api.cal.com',
		},
	];

	authenticate = {
		type: 'queryAuth',
		properties: {
			key: 'apiKey',
			value: '={{$credentials.apiKey}}',
		},
	} as IAuthenticateQueryAuth;

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '=/v1/memberships',
		},
	};
}
