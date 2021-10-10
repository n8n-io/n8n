import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Sms77Api implements ICredentialType {
	name = 'sms77Api';
	displayName = 'Sms77 API';
	documentationUrl = 'sms77';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
