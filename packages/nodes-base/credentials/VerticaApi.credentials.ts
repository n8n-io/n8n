import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class VerticaApi implements ICredentialType {
	name = 'verticaApi';

	displayName = 'Vertica API';

	documentationUrl = 'https://docs.vertica.com/24.4.x/en/';

	properties: INodeProperties[] = [
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
