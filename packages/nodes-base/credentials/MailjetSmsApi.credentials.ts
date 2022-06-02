import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailjetSmsApi implements ICredentialType {
	name = 'mailjetSmsApi';
	displayName = 'Mailjet SMS API';
	documentationUrl = 'mailjet';
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
	];
	authenticate: IAuthenticateHeaderAuth = {
		type: 'headerAuth',
		properties: {
			name: 'Authorization',
			value: '=Bearer {{$credentials.token}}',
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: `https://api.mailjet.com`,
			url: '/v4/sms',
			method: 'GET',
		},
	};
}
