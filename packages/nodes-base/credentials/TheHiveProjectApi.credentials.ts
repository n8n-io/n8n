import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TheHiveProjectApi implements ICredentialType {
	name = 'theHiveProjectApi';

	displayName = 'The Hive 5 API';

	documentationUrl = 'theHive';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'ApiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'URL',
			name: 'url',
			default: '',
			type: 'string',
			description: 'The URL of TheHive instance',
			placeholder: 'https://localhost:9000',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.ApiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/api/case',
		},
	};
}
