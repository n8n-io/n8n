import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SerpApi implements ICredentialType {
	name = 'serpApi';

	displayName = 'SerpAPI';

	documentationUrl = 'serp';

	properties: INodeProperties[] = [
		{
			displayName:
				'This node is deprecated and will not be updated in the future. Please use the official verified community node instead.',
			name: 'oldVersionNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://serpapi.com',
			url: '/account.json ',
		},
	};
}
