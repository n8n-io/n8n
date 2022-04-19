import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailjetSmsApi implements ICredentialType {
	name = 'mailjetSmsApi';
	displayName = 'Mailjet SMS API';
	documentationUrl = 'mailjet';
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
	];
}
