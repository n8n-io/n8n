import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DfirIrisApi implements ICredentialType {
	name = 'dfirIrisApi';

	displayName = 'DFIR-IRIS API';

	documentationUrl = 'dfiriris';

	icon = { light: 'file:icons/DfirIris.svg', dark: 'file:icons/DfirIris.svg' } as const;

	httpRequestNode = {
		name: 'DFIR-IRIS',
		docsUrl: 'https://docs.dfir-iris.org/operations/api/',
		apiBaseUrlPlaceholder: 'http://<yourserver_ip>/manage/cases/list',
	};

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
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'skipSslCertificateValidation',
			type: 'boolean',
			default: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/ping',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials.skipSslCertificateValidation}}',
		},
	};
}
