import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BrandfetchApi implements ICredentialType {
	name = 'brandfetchApi';

	displayName = 'Brandfetch API';

	documentationUrl = 'brandfetch';

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
