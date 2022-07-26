import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MailcheckApi implements ICredentialType {
	name = 'mailcheckApi';
	displayName = 'Mailcheck API';
	documentationUrl = 'mailcheck';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
