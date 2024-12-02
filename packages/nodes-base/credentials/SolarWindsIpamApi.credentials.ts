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
			displayName: 'Instance URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
			description:
				'Base URL of your SolarWinds IPAM instance (e.g., https://your-instance.solarwinds.com).',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
			description: 'Your API token for authenticating requests to SolarWinds IPAM.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '', //TODO
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
