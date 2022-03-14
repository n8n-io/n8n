import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailjetEmailApi implements ICredentialType {
	name = 'mailjetEmailApi';
	displayName = 'Mailjet Email API';
	documentationUrl = 'mailjet';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			default: '',
		},
	];
}
