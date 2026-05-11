import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ChatHubVectorStoreQdrantApi implements ICredentialType {
	name = 'chatHubVectorStoreQdrantApi';

	extends = ['qdrantApi'];

	displayName = 'ChatHub Qdrant Vector Store API';

	documentationUrl = 'qdrant';

	properties: INodeProperties[] = [
		{
			displayName: 'Collection Name',
			name: 'collectionName',
			type: 'string',
			default: 'n8n_vectors',
			description:
				'The Qdrant collection to use. All users share this collection; access is scoped per user via a userId metadata field. The collection is created automatically if it does not exist.',
		},
	];
}
