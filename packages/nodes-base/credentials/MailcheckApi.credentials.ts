import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MailcheckApi implements ICredentialType {
	name = 'mailcheckApi';
	displayName = 'Mailcheck API';
	documentationUrl = 'mailcheck';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
