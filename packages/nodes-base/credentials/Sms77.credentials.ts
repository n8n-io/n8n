import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Sms77 implements ICredentialType {
	name = 'Sms77';
	displayName = 'Sms77';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
