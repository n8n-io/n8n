import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Snowflake implements ICredentialType {
	name = 'snowflake';

	displayName = 'Snowflake';

	documentationUrl = 'snowflake';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			type: 'string',
			default: '',
			description: 'Enter the name of your Snowflake account',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
			description: 'Specify the database you want to use after creating the connection',
		},
		{
			displayName: 'Warehouse',
			name: 'warehouse',
			type: 'string',
			default: '',
			description:
				'The default virtual warehouse to use for the session after connecting. Used for performing queries, loading data, etc.',
		},
		{
			displayName: 'Username',
			name: 'username',
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
			displayName: 'Schema',
			name: 'schema',
			type: 'string',
			default: '',
			description: 'Enter the schema you want to use after creating the connection',
		},
		{
			displayName: 'Role',
			name: 'role',
			type: 'string',
			default: '',
			description: 'Enter the security role you want to use after creating the connection',
		},
		{
			displayName: 'Client Session Keep Alive',
			name: 'clientSessionKeepAlive',
			type: 'boolean',
			default: false,
			description:
				'Whether to keep alive the client session. By default, client connections typically time out approximately 3-4 hours after the most recent query was executed. If the parameter clientSessionKeepAlive is set to true, the client’s connection to the server will be kept alive indefinitely, even if no queries are executed.',
		},
	];
}
