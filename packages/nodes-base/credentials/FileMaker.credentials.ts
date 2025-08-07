import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FileMaker implements ICredentialType {
	name = 'fileMaker';

	displayName = 'FileMaker API';

	documentationUrl = 'fileMaker';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Database',
			name: 'db',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Login',
			name: 'login',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];
}
