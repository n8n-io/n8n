import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class XataApi implements ICredentialType {
	name = 'xataApi';

	displayName = 'Xata PostgreSQL Direct Connection';

	documentationUrl = 'xata';

	properties: INodeProperties[] = [
		{
			displayName: 'Database Connection String',
			name: 'databaseConnectionString',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'postgres://{username}:{password}@{host}:{port}/{database}',
		},
	];
}
