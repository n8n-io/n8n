import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ServiceNowBasicApi implements ICredentialType {
	name = 'serviceNowBasicApi';

	extends = ['httpBasicAuth'];

	displayName = 'ServiceNow Basic Auth API';

	documentationUrl = 'serviceNow';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Use custom host?',
			name: 'useCustomHost',
			type: 'boolean',
			default: false,
			description:
				'Enable if your ServiceNow instance is hosted on a custom domain or behind a reverse-proxy',
		},
		{
			displayName: 'Custom Host',
			name: 'customHost',
			type: 'string',
			placeholder: 'https://sn.my-company.internal',
			description: 'Full base-URL of the instance',
			required: true,
			default: '',
			displayOptions: {
				show: {
					useCustomHost: [true],
				},
			},
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			hint: 'The subdomain can be extracted from the URL. If the URL is: https://dev99890.service-now.com the subdomain is dev99890',
			required: true,
			displayOptions: {
				show: {
					useCustomHost: [false],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.user}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ $credentials.useCustomHost ? $credentials.customHost.replace(/\\/$/, "") : `https://${$credentials.subdomain}.service-now.com` }}',
			url: '/api/now/table/sys_user_role',
		},
	};
}
