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
		docsUrl: 'https://documentation.solarwinds.com/',
		apiBaseUrlPlaceholder: 'https://api.xx-yy.cloud.solarwinds.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '/v1/metrics',
			method: 'GET',
		},
	};
}
