import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class NedzoApi implements ICredentialType {
	name = 'nedzoApi';

	displayName = 'Nedzo API';

	documentationUrl = 'nedzo';

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
