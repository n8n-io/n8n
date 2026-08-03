import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OdooApi implements ICredentialType {
	name = 'odooApi';

	displayName = 'Odoo API';

	documentationUrl = 'odoo';

	properties: INodeProperties[] = [
		{
			displayName:
				'⚠️ The /jsonrpc endpoint used by this credential is deprecated and will be removed in Odoo 22 (fall 2028) and Odoo Online 21.1 (winter 2027). Migrate to the API Key credential when upgrading to Odoo 19+. <a href="https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html" target="_blank">Learn more</a>',
			name: 'deprecationNotice',
			type: 'notice',
			default: '',
		},
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
