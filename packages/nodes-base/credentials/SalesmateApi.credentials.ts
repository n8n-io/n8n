import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SalesmateApi implements ICredentialType {
	name = 'salesmateApi';

	displayName = 'Salesmate API';

	documentationUrl = 'salesmate';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'n8n.salesmate.io',
		},
	];
}
