import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NocoDbApiToken implements ICredentialType {
	name = 'nocoDbApiToken';

	displayName = 'NocoDB API Token';

	documentationUrl = 'nocodb';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Cloud NocoDB',
			name: 'isCloudNocoDb',
			type: 'boolean',
			description: 'Switch this on if using NocoDB cloud at https://app.nocodb.com',
			// cannot be true due to existing creds will also be set to true
			default: false,
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'http(s)://localhost:8080',
			displayOptions: {
				show: {
					isCloudNocoDb: [false],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'xc-token': '={{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.isCloudNocoDb ? "https://app.nocodb.com" : $credentials.host }}',
			url: '/api/v1/auth/user/me',
		},
	};
}
