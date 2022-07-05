import {
	IAuthenticate,
	IAuthenticateGeneric,
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
		type: 'generic',
		properties: {
			Authorization: '=Bearer {{$credentials.apiKey}}',
		},
	} as IAuthenticateGeneric;
}
