import {
	IAuthenticate,
	IAuthenticateHeaderAuth,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SendGridApi implements ICredentialType {
	name = 'sendGridApi';
	displayName = 'SendGrid API';
	documentationUrl = 'sendgrid';
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
			name: 'Authorization',
			value: '=Bearer {{$credentials.apiKey}}',
		},
	} as IAuthenticateHeaderAuth;
}
