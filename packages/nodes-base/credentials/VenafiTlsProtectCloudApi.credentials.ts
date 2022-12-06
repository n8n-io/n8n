import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class VenafiTlsProtectCloudApi implements ICredentialType {
	name = 'venafiTlsProtectCloudApi';

	displayName = 'Venafi TLS Protect Cloud';

	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
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
			baseURL: 'https://api.venafi.cloud',
			url: '/v1/preferences',
		},
	};
}
