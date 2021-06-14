import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailchimpApi implements ICredentialType {
	name = 'mailchimpApi';
	displayName = 'Mailchimp API';
	documentationUrl = 'mailchimp';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
