import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KibanaApi implements ICredentialType {
	name = 'kibanaApi';

	displayName = 'Kibana API';

	icon = 'file:icons/Kibana.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
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
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
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
			baseURL: '={{$credentials?.apiUrl}}:{{$credentials.port}}',
			url: '/api/features',
		},
	};
}
