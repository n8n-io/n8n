import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VenafiTlsProtectCloudApi implements ICredentialType {
	name = 'venafiTlsProtectCloudApi';

	displayName = 'Venafi TLS Protect Cloud';

	documentationUrl = 'venafitlsprotectcloud';

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'US',
					value: 'cloud',
				},
				{
					name: 'EU',
					value: 'eu',
				},
			],
			default: 'cloud',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'tppl-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.venafi.{{$credentials.region ?? "cloud"}}',
			url: '/v1/preferences',
		},
	};
}
