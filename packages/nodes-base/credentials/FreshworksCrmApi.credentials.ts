import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FreshworksCrmApi implements ICredentialType {
	name = 'freshworksCrmApi';
	displayName = 'Freshworks CRM API';
	documentationUrl = 'freshdesk';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			placeholder: 'BDsTn15vHezBlt_XGp3Tig',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'n8n-org',
			description: 'Domain in the Freshworks CRM org URL. For example, in <code>https://n8n-org.myfreshworks.com</code>, the domain is <code>n8n-org</code>.',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'myfreshworks.com',
			placeholder: '',
			description: 'Host in the Freshworks CRM org URL. For example, in <code>https://n8n-org.myfreshworks.com</code>, the host is <code>myfreshworks.com</code>.',
		},		
	];
}
