import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SearchApi implements ICredentialType {
	name = 'searchApi';

	displayName = 'SearchApi';

	documentationUrl = 'searchapi';

	properties: INodeProperties[] = [
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
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				"X-SearchApi-Source": "N8n"
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.searchapi.io',
			url: '/api/v1/search?engine=google&q=n8n',
		},
	};
}
