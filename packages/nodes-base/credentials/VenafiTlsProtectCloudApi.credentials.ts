import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
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

	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			'tppl-api-key': credentials.apiKey,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.venafi.cloud',
			url: '/v1/preferences',
		},
	};
}
