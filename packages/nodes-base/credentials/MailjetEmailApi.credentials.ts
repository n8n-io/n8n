import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailjetEmailApi implements ICredentialType {
	name = 'mailjetEmailApi';
	displayName = 'Mailjet Email API';
	documentationUrl = 'mailjet';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Sandbox Mode',
			name: 'sandboxMode',
			type: 'boolean',
			default: false,
			description:
				'Whether to allow to run the API call in a Sandbox mode, where all validations of the payload will be done without delivering the message',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.apiKey}}',
				password: '={{$credentials.secretKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: `https://api.mailjet.com`,
			url: '/v3/REST/template',
			method: 'GET',
		},
	};
}
