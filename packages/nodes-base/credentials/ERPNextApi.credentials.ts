import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ERPNextApi implements ICredentialType {
	name = 'erpNextApi';

	displayName = 'ERPNext API';

	documentationUrl = 'erpnext';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-Hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description:
				'Subdomain of cloud-hosted ERPNext instance. For example, "n8n" is the subdomain in: <code>https://n8n.erpnext.com</code>',
			displayOptions: {
				show: {
					environment: ['cloudHosted'],
				},
			},
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'options',
			default: 'erpnext.com',
			options: [
				{
					name: 'erpnext.com',
					value: 'erpnext.com',
				},
				{
					name: 'frappe.cloud',
					value: 'frappe.cloud',
				},
			],
			description: 'Domain for your cloud hosted ERPNext instance.',
			displayOptions: {
				show: {
					environment: ['cloudHosted'],
				},
			},
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			description: 'Fully qualified domain name of self-hosted ERPNext instance',
			displayOptions: {
				show: {
					environment: ['selfHosted'],
				},
			},
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=token {{$credentials.apiKey}}:{{$credentials.apiSecret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "cloudHosted" ? "https://" + $credentials.subdomain + "." + $credentials.domain : $credentials.domain}}',
			url: '/api/method/frappe.auth.get_logged_user',
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'message',
					value: undefined,
					message: 'Unable to authenticate, Check the credentials and the url',
				},
			},
		],
	};
}
