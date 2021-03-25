import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class MySql implements ICredentialType {
	name = 'mySql';
	displayName = 'MySQL';
	documentationUrl = 'mySql';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string' as NodePropertyTypes,
			default: 'mysql',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: 'mysql',
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
			default: 3306,
		},
		{
			displayName: 'Connect Timeout',
			name: 'connectTimeout',
			type: 'number' as NodePropertyTypes,
			default: 10000,
			description: 'The milliseconds before a timeout occurs during the initial connection to the MySQL server.',
		},	
	];
}
