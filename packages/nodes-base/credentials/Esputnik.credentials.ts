import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class Esputnik implements ICredentialType {
	name = 'esputnikApi';
	displayName = 'Esputnik API';
	documentationUrl = 'Esputnik';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true
			},
			default: ''
		}
	];
}
