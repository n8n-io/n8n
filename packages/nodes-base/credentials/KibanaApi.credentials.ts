import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KibanaApi implements ICredentialType {
	name = 'kibanaApi';

	displayName = 'Kibana API';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
			placeholder: 'http://localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: '',
			placeholder: '5601',
		},
		{
			displayName: 'Authentication Type',
			name: 'authenticationType',
			type: 'options',
			options: [
				{
					name: 'API Token',
					value: 'apiToken',
				},
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
			],
			default: 'apiToken',
		},
		{
			displayName: 'apiToken',
			name: 'apiToken',
			type: 'string',
			displayOptions: {
				show: {
					authenticationType: ['apiToken'],
				},
			},
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					authenticationType: ['basicAuth'],
				},
			},
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			displayOptions: {
				show: {
					authenticationType: ['basicAuth'],
				},
			},
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'kbn-xsrf': true,
			},
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$apiUrl}}:={{$port}}',
			url: '/api/features',
		},
	};
}
