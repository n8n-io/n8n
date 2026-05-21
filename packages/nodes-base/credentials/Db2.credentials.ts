import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class Db2 implements ICredentialType {
	name = 'db2';

	displayName = 'IBM DB2';

	documentationUrl = 'db2';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
			required: true,
			description: 'The hostname or IP address of the DB2 server',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 50000,
			required: true,
			description: 'The port number of the DB2 server (default: 50000)',
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
			typeOptions: {
				password: true,
			},
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
			displayName: 'SSL Certificate',
			name: 'sslCertificate',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [true],
				},
			},
			default: '',
			description: 'The SSL/TLS certificate for secure connections (optional)',
		},
		{
			displayName: 'Connection Timeout',
			name: 'connectionTimeout',
			type: 'number',
			default: 30,
			description: 'Connection timeout in seconds',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};
}

// Made with Bob
