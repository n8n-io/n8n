import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OnlyofficeDocspaceBasicAuthApi implements ICredentialType {
	name = 'onlyofficeDocspaceBasicAuthApi';

	displayName = 'ONLYOFFICE DocSpace Basic Authentication API';

	documentationUrl = 'onlyofficeDocspace';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			description: 'The base URL of your ONLYOFFICE DocSpace portal',
			placeholder: 'https://yourportal.onlyoffice.com',
			required: true,
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			description: 'The email for your ONLYOFFICE DocSpace portal',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The password for your ONLYOFFICE DocSpace portal',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials?.email}}',
				password: '={{$credentials?.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'api/2.0/authentication',
			baseURL: '={{$credentials?.baseUrl}}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'response',
					value: false,
					message: 'Invalid email or password',
				},
			},
		],
	};
}
