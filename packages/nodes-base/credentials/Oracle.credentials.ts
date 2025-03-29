import { ICredentialType, INodeProperties } from 'n8n-workflow';

export type IOracleCredentials = {
	user: string;
	password: string;
	connectionString: string;
};

export class Oracle implements ICredentialType {
	name = 'oracleCredentials';
	displayName = 'Oracle Credentials';
	documentationUrl = 'oracleCredentials';
	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'system',
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
			displayName: 'Connection String',
			name: 'connectionString',
			type: 'string',
			default: 'localhost/orcl',
		},
		{
			displayName: 'Use Thin mode',
			name: 'thinMode',
			type: 'boolean',
			default: true,
			description: 'Define type of connection with database',
		},
	];
}
