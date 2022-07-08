import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class NocoDbApiToken implements ICredentialType {
	name = 'nocoDbApiToken';
	displayName = 'NocoDB API Token';
	documentationUrl = 'nocoDb';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'http(s)://localhost:8080',
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
			baseURL: '={{$credentials?.host}}',
			url: '/user/me',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'isAuthorized',
					value: false,
					message: 'Invalid API Token',
				},
			},
		],
	};

}
