import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SendGridApi implements ICredentialType {
	name = 'sendGridApi';
	displayName = 'SendGrid API';
	documentationUrl = 'sendgrid';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
