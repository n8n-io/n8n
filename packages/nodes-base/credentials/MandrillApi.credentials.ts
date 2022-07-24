import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MandrillApi implements ICredentialType {
	name = 'mandrillApi';
	displayName = 'Mandrill API';
	documentationUrl = 'mandrill';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
