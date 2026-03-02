import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class VectorStoreQdrantScopedApi implements ICredentialType {
	name = 'vectorStoreQdrantScopedApi';

	extends = ['qdrantApi'];

	displayName = 'Qdrant Vector Store (User-Scoped) API';

	documentationUrl = 'qdrant';

	properties: INodeProperties[] = [
		{
			displayName: 'Collection Name Prefix',
			name: 'collectionNamePrefix',
			type: 'string',
			default: 'n8n_vectors',
			description:
				'Prefix for collection names. The full collection name will be {prefix}_{userId}.',
		},
	];
}
