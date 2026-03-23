import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZepApi implements ICredentialType {
	name = 'zepApi';

	displayName = 'Zep Api';

	documentationUrl = 'zep';

	properties: INodeProperties[] = [
		{
			displayName: 'This Zep integration is deprecated and will be removed in a future version.',
			name: 'deprecationNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
		},
		{
			displayName: 'Cloud',
			description: 'Whether you are adding credentials for Zep Cloud instead of Zep Open Source',
			name: 'cloud',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			required: false,
			type: 'string',
			default: 'http://localhost:8000',
			displayOptions: {
				show: {
					cloud: [false],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization:
					'={{$credentials.apiKey && !$credentials.cloud ? "Bearer " + $credentials.apiKey : "Api-Key " + $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{!$credentials.cloud ? $credentials.apiUrl : "https://api.getzep.com"}}',
			url: '={{!$credentials.cloud ? "/api/v1/collection" : "/api/v2/collections"}}',
		},
	};
}
