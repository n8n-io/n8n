import {
	IAuthenticate,
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
					name: 'Version 1',
					value: 'v1',
					description: 'API version supported by TheHive 4',
				},
				{
					name: 'Version 0',
					value: '',
					description: 'API version supported by TheHive 3',
				},
			],
		},
		{
			displayName: 'Ignore SSL Issues',
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
			baseURL: `={{$credentials?.url}}`,
			url: '/api/case',
		},
	};
}
