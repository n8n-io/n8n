import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TheHiveApi implements ICredentialType {
	name = 'theHiveApi';

	displayName = 'The Hive API';

	documentationUrl = 'theHive';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'ApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
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
			displayName: 'API Version',
			name: 'apiVersion',
			default: '',
			type: 'options',
			description: 'The version of api to be used',
			options: [
				{
					name: 'TheHive 4+ (api v1)',
					value: 'v1',
					description:
						'API version with TheHive 4 support, also works with TheHive 5 but not all features are supported',
				},
				{
					name: 'TheHive 3 (api v0)',
					value: '',
					description: 'API version with TheHive 3 support',
				},
			],
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
