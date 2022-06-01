import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class MariaDB implements ICredentialType {
	name = 'mariaDB';
	displayName = 'MariaDB';
	documentationUrl = 'mariaDB';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'mariadb',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'mariadb',
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
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 3306,
		},
		{
			displayName: 'Connect Timeout',
			name: 'connectTimeout',
			type: 'number',
			default: 10000,
			description: 'Sets the connection timeout in milliseconds',
		},
		{
			displayName: 'Query Timeout',
			name: 'queryTimeout',
			type: 'number',
			default: 0,
			description: 'Set maximum query time in ms (an error will be thrown if limit is reached). 0 or undefined meaning no timeout. This can be superseded for a query using timeout option',
		},
		{
			displayName: 'Rows as Array',
			name: 'rowsAsArray',
			type: 'boolean',
			default: false,
			description: 'Returns result-sets as arrays, rather than JSON. This is a faster way to get results',
		},
		{
			displayName: 'Session Time Zone',
			name: 'time_zone',
			type: 'string',
			default: 'UTC',
			description: 'The time zone for the session. Execute `SELECT @@system_time_zone` on the server to check the server default timezone',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'CA Certificate',
			name: 'caCertificate',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Private Key',
			name: 'clientPrivateKey',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Certificate',
			name: 'clientCertificate',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					ssl: [
						true,
					],
				},
			},
			type: 'string',
			default: '',
		},
	];
}
