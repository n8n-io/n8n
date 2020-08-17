import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MailchimpApi implements ICredentialType {
	name = 'mailchimpApi';
	displayName = 'Mailchimp API';
	documentationUrl = 'mailchimp';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
