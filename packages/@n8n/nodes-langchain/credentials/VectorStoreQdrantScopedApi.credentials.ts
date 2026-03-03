import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class VectorStoreQdrantScopedApi implements ICredentialType {
	name = 'vectorStoreQdrantScopedApi';

	extends = ['qdrantApi'];

	displayName = 'Qdrant Vector Store (User-Scoped) API';

	documentationUrl = 'qdrant';

	properties: INodeProperties[] = [
		{
			displayName: 'Collection Name',
			name: 'collectionName',
			type: 'string',
			default: 'n8n_vectors',
			description:
				'The Qdrant collection to use. All users share this collection; access is scoped per user via a userId metadata field.',
		},
	];
}
