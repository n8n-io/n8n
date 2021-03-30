import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ERPNextApi implements ICredentialType {
	name = 'erpNextApi';
	displayName = 'ERPNext API';
	documentationUrl = 'erpnext';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'n8n',
			description: 'ERPNext subdomain. For instance, entering n8n will make the url look like: https://n8n.erpnext.com/.',
		},
	];
}
