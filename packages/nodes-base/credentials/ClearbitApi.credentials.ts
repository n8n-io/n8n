import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ClearbitApi implements ICredentialType {
	name = 'clearbitApi';
	displayName = 'Clearbit API';
	documentationUrl = 'clearbit';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
