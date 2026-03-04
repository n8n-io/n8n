import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HologresApi implements ICredentialType {
	name = 'hologresApi';

	displayName = 'Hologres';

	documentationUrl = 'hologres';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 80,
			description: 'Default Hologres port is 80',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'postgres',
		},
		{
			displayName: 'User',
			name: 'user',
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
			displayName: 'Maximum Number of Connections',
			name: 'maxConnections',
			type: 'number',
			default: 100,
			description:
				'Make sure this value is lower than the maximum number of connections your Hologres instance allows.',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
			options: [
				{ name: 'Disable', value: 'disable' },
				{ name: 'Allow', value: 'allow' },
				{ name: 'Require', value: 'require' },
			],
			default: 'disable',
			description: 'Whether to use SSL to connect to Hologres',
		},
		{
			displayName: 'Allow Unauthorized Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if the server certificate validation fails (e.g. self-signed certificates)',
		},
	];
}
