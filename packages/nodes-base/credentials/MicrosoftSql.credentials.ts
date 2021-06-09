import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class MicrosoftSql implements ICredentialType {
	name = 'microsoftSql';
	displayName = 'Microsoft SQL';
	documentationUrl = 'microsoftSql';
	properties = [
		{
			displayName: 'Server',
			name: 'server',
			type: 'string' as NodePropertyTypes,
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string' as NodePropertyTypes,
			default: 'master',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: 'sa',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 1433,
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'TLS',
			name: 'tls',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
		{
			displayName: 'Connect Timeout',
			name: 'connectTimeout',
			type: 'number' as NodePropertyTypes,
			default: 15000,
			description: 'Connection timeout in ms.',
		},
	];
}
