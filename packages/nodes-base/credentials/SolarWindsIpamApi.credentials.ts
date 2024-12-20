import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SolarWindsIpamApi implements ICredentialType {
	name = 'solarWindsIpamApi';

	displayName = 'SolarWinds IPAM';

	documentationUrl = 'solarwindsipam';

	icon = {
		light: 'file:icons/SolarWindsIpam.svg',
		dark: 'file:icons/SolarWindsIpam.svg',
	} as const;

	httpRequestNode = {
		name: 'SolarWinds IPAM',
		docsUrl: 'https://www.solarwinds.com/ip-address-manager',
		apiBaseUrlPlaceholder: 'https://your-ipam-server',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'https://your-ipam-server',
			description: 'The base URL of your SolarWinds IPAM server.',
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
			type: 'string',
			default: '',
			description: 'The username for SolarWinds IPAM API.',
		},
		{
			displayName: 'Password',
			name: 'password',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The password for SolarWinds IPAM API.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '/SolarWinds/InformationService/v3/Json/Query',
			method: 'GET',
			qs: {
				query: 'SELECT TOP 1 AccountID FROM IPAM.AccountRoles',
			},
			skipSslCertificateValidation: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message: 'Connection failed: Invalid credentials or unreachable server',
				},
			},
		],
	};
}
