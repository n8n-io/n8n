import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class VectorStorePGVectorScopedApi implements ICredentialType {
	name = 'vectorStorePGVectorScopedApi';

	extends = ['postgres'];

	displayName = 'PGVector Store (User-Scoped) API';

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
