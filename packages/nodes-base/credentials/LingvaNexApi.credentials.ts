import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class LingvaNexApi implements ICredentialType {
	name = 'lingvaNexApi';

	displayName = 'LingvaNex API';

	documentationUrl = 'lingvanex';

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
