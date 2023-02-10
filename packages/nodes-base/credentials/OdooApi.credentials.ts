import type { ICredentialType, INodeProperties, NodePropertyTypes } from 'n8n-workflow';

export class OdooApi implements ICredentialType {
	name = 'odooApi';

	displayName = 'Odoo API';

	documentationUrl = 'odoo';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://my-organization.odoo.com',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'user@email.com',
			required: true,
		},
		{
			displayName: 'Password or API Key',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
		{
			displayName: 'Database Name',
			name: 'db',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
