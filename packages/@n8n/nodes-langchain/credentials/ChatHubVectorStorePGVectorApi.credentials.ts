import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ChatHubVectorStorePGVectorApi implements ICredentialType {
	name = 'chatHubVectorStorePGVectorApi';

	extends = ['postgres'];

	displayName = 'ChatHub PGVector Store API';

	documentationUrl = 'postgres';

	properties: INodeProperties[] = [
		{
			displayName: 'Table Name Prefix',
			name: 'tableNamePrefix',
			type: 'string',
			default: 'n8n_vectors',
			description: 'Prefix for table names. The full table name will be {prefix}_{userId}.',
		},
	];
}
