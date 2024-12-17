import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class VerticaApi implements ICredentialType {
	name = 'verticaApi';

	displayName = 'Vertica API';

	documentationUrl = 'vertica';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'http://<vertica_host>:<http_port>/v1',
			description: 'The base URL of your Vertica server.',
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
}
