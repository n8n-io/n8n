import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MailjetSmsApi implements ICredentialType {
	name = 'mailjetSmsApi';
	displayName = 'Mailjet SMS API';
	documentationUrl = 'mailjet';
	properties = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
