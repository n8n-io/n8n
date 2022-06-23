import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SendInBlueApi implements ICredentialType {
	name = 'sendinblueApi';
	displayName = 'SendInBlue API';
	documentationUrl = 'sendinblue';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: 'https://api.sendinblue.com',
		},
	];
	authenticate = {
		type: 'headerAuth',
		properties: {
			name: 'api-key',
			value: '={{$credentials.apiKey}}',
		},
	} as IAuthenticateHeaderAuth;
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain}}/v3',
			url: '/account',
		},
	};
}
