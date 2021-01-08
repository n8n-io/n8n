import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SendgridApi implements ICredentialType {
	name = 'sendgridApi';
	displayName = 'SendGrid Api';
	documentationUrl = 'sendgrid'
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
