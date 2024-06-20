import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OdooApi implements ICredentialType {
	name = 'odooApi';

	displayName = 'Odoo API';

	documentationUrl = 'odoo';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://my-organization.odoo.com',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'user@email.com',
			required: true,
		},
		{
			displayName: 'Password or API Key',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
		{
			displayName: 'Database Name',
			name: 'db',
			type: 'string',
			default: '',
		},
	];
}
