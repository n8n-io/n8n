import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CopperApi implements ICredentialType {
	name = 'copperApi';
	displayName = 'Copper API';
	documentationUrl = 'copper';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			required: true,
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
	];
}
