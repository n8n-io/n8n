import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class ClockifyApi implements ICredentialType {
	name = 'clockifyApi';
	displayName = 'Clockify API';
	documentationUrl = 'clockify';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	authenticate = {
		type: 'headerAuth',
		properties: {
			name: 'X-Api-Key',
			value: '={{$credentials.apiKey}}',
		},
	} as IAuthenticateHeaderAuth;
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.clockify.me/api/v1',
			url: '/workspaces',
		},
	};
}
