import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftSql implements ICredentialType {
	name = 'microsoftSql';

	displayName = 'Microsoft SQL';

	documentationUrl = 'microsoftSql';

	properties: INodeProperties[] = [
		{
			displayName: 'Server',
			name: 'server',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'master',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'sa',
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
			default: 1433,
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'TLS',
			name: 'tls',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
		{
			displayName: 'Connect Timeout',
			name: 'connectTimeout',
			type: 'number',
			default: 15000,
			description: 'Connection timeout in ms',
		},
		{
			displayName: 'Request Timeout',
			name: 'requestTimeout',
			type: 'number',
			default: 15000,
			description: 'Request timeout in ms',
		},
		{
			displayName: 'TDS Version',
			name: 'tdsVersion',
			type: 'options',
			options: [
				{
					name: '7_4 (SQL Server 2012 ~ 2019)',
					value: '7_4',
				},
				{
					name: '7_3_B (SQL Server 2008R2)',
					value: '7_3_B',
				},
				{
					name: '7_3_A (SQL Server 2008)',
					value: '7_3_A',
				},
				{
					name: '7_2 (SQL Server 2005)',
					value: '7_2',
				},
				{
					name: '7_1 (SQL Server 2000)',
					value: '7_1',
				},
			],
			default: '7_4',
			description:
				"The version of TDS to use. If server doesn't support specified version, negotiated version is used instead.",
		},
	];
}
