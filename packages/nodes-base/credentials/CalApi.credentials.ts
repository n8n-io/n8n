import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CalApi implements ICredentialType {
	name = 'calApi';

	displayName = 'Cal API';

	documentationUrl = 'cal';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://api.cal.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.host }}',
			url: '=/v2/me',
		},
	};
}
