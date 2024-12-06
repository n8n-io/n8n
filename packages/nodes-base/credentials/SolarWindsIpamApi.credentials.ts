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
			displayName: 'Server Type',
			name: 'serverType',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'Enter server type (e.g., Orion v3)',
			description: 'Enter the server type for SolarWinds IPAM connection.',
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
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'error',
					value: 'invalid_auth',
					message: 'Invalid access token',
				},
			},
		],
	};
}
