import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerticaApi implements ICredentialType {
	name = 'verticaApi';

	displayName = 'Vertica API';

	documentationUrl = 'https://docs.vertica.com/24.4.x/en/';

	httpRequestNode = {
		name: 'Vertica',
		docsUrl: 'https://docs.vertica.com/24.4.x/en/',
		apiBaseUrlPlaceholder: 'http://<server>:<port>/v1/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: 'https://localhost:8443',
			placeholder: 'https://<server>:<port>',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'The username for accessing the Vertica database.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The password for accessing the Vertica database.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '/v1/nodes',
			method: 'GET',
			skipSslCertificateValidation: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message: 'Connection failed: Invalid credentials or unreachable server',
				},
			},
		],
	};
}
