import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MailerLiteApi implements ICredentialType {
	name = 'mailerLiteApi';
	displayName = 'Mailer Lite API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
