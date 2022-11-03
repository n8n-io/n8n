import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailgunApi implements ICredentialType {
	name = 'mailgunApi';
	displayName = 'Mailgun API';
	documentationUrl = 'mailgun';
	properties: INodeProperties[] = [
		{
			displayName: 'API Domain',
			name: 'apiDomain',
			type: 'options',
			options: [
				{
					name: 'api.eu.mailgun.net',
					value: 'api.eu.mailgun.net',
				},
				{
					name: 'api.mailgun.net',
					value: 'api.mailgun.net',
				},
			],
			default: 'api.mailgun.net',
			description: 'The configured mailgun API domain',
		},
		{
			displayName: 'Email Domain',
			name: 'emailDomain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: 'api',
				password: '={{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.apiDomain}}/v3',
			url: '/domains',
		},
	};
}
