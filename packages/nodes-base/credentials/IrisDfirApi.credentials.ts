import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class IrisDfirApi implements ICredentialType {
	name = 'irisDfirApi';

	displayName = 'IRIS DFIR API';

	documentationUrl = 'irisdfir';

	icon = { light: 'file:icons/IrisDfir.svg', dark: 'file:icons/IrisDfir.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://localhost',
			description:
				'The API endpoints are reachable on the same Address and port as the web interface.',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'skipSslCertificateValidation',
			type: 'boolean',
			default: false,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			Authorization: 'Bearer ' + credentials.apiKey,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/ping',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials.skipSslCertificateValidation}}',
		},
	};
}
