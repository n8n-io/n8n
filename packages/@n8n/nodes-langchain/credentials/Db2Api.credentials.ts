import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Db2Api implements ICredentialType {
	name = 'db2Api';

	displayName = 'Db2 API';

	documentationUrl = 'db2';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
			required: true,
			description: 'The hostname or IP address of the Db2 server',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 50000,
			required: true,
			description: 'The port number of the Db2 server',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
			required: true,
			description: 'The name of the database to connect to',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
			required: true,
			description: 'The username for authentication',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The password for authentication',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
			description: 'Whether to use SSL/TLS for the connection',
		},
		{
			displayName: 'SSL Certificate Path',
			name: 'sslCertificate',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			description:
				'Full path to the SSL certificate file (.arm, .cert, or .pem format). The file must be accessible to the n8n process. Example: /path/to/cert.arm',
			placeholder: '/path/to/certificate.arm',
		},
		{
			displayName: 'Connection Timeout',
			name: 'connectionTimeout',
			type: 'number',
			default: 30,
			description: 'Connection timeout in seconds',
		},
	];
}

// Made with Bob
