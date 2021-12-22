import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OdooApi implements ICredentialType {
	name = 'odooApi';
	displayName = 'Odoo API';
	documentationUrl = 'httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		}
	];
}
