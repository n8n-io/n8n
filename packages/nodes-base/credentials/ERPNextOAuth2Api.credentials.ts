import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class ERPNextOAuth2Api implements ICredentialType {
	name = 'erpNextOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'ERPNext OAuth2 API';
	properties = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
            default: '',
            placeholder: 'n8n',
            description: 'ERPNext subdomain. For instance, entering n8n will make the url look like: https://n8n.erpnext.com/.'
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://{SUBDOMAIN_HERE}.erpnext.com/api/method/frappe.integrations.oauth2.authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://{SUBDOMAIN_HERE}.erpnext.com/api/method/frappe.integrations.oauth2.get_token',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
			description: 'Resource to consume.',
		},
	];
}
