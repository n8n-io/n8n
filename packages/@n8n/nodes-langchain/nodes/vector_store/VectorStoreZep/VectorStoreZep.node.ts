import { ZepVectorStore } from '@langchain/community/vectorstores/zep';
import { ZepCloudVectorStore } from '@langchain/community/vectorstores/zep_cloud';
import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

const embeddingDimensions: INodeProperties = {
	displayName: 'Embedding Dimensions',
	name: 'embeddingDimensions',
	type: 'number',
	default: 1536,
	description: 'Whether to allow using characters from the Unicode surrogate blocks',
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			embeddingDimensions,
			{
				displayName: 'Is Auto Embedded',
				name: 'isAutoEmbedded',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically embed documents when they are added',
			},
		],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [embeddingDimensions, metadataFilterField],
	},
];

export class VectorStoreZep extends createVectorStoreNode<ZepVectorStore | ZepCloudVectorStore>({
	meta: {
		displayName: 'Zep Vector Store',
		name: 'vectorStoreZep',
		description: 'Work with your data in Zep Vector Store',
		credentials: [
			{
				name: 'zepApi',
				required: true,
			},
		],
		icon: 'file:zep.png',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorezep/',
	},
	sharedFields: [
		{
			displayName: 'Collection Name',
			name: 'collectionName',
			type: 'string',
			default: '',
			required: true,
		},
	],
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;

		const options =
			(context.getNodeParameter('options', itemIndex) as {
				embeddingDimensions?: number;
			}) || {};

		const credentials = await context.getCredentials<{
			apiKey?: string;
			apiUrl: string;
			cloud: boolean;
		}>('zepApi');

		const zepConfig = {
			apiKey: credentials.apiKey,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			metadata: filter,
		};

		if (credentials.cloud) {
			return new ZepCloudVectorStore(embeddings, zepConfig);
		} else {
			return new ZepVectorStore(embeddings, { ...zepConfig, apiUrl: credentials.apiUrl });
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;
		const options =
			(context.getNodeParameter('options', itemIndex) as {
				isAutoEmbedded?: boolean;
				embeddingDimensions?: number;
			}) || {};

		const credentials = await context.getCredentials<{
			apiKey?: string;
			apiUrl: string;
			cloud: boolean;
		}>('zepApi');

		const zepConfig = {
			apiKey: credentials.apiKey,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			isAutoEmbedded: options.isAutoEmbedded ?? true,
		};

		try {
			if (credentials.cloud) {
				await ZepCloudVectorStore.fromDocuments(documents, embeddings, zepConfig);
			} else {
				await ZepVectorStore.fromDocuments(documents, embeddings, {
					...zepConfig,
					apiUrl: credentials.apiUrl,
				});
			}
		} catch (error) {
			const errorCode = (error as IDataObject).code as number;
			const responseData = (error as IDataObject).responseData as string;
			if (errorCode === 400 && responseData.includes('CreateDocumentCollectionRequest')) {
				throw new NodeOperationError(context.getNode(), `Collection ${collectionName} not found`, {
					itemIndex,
					description:
						'Please check that the collection exists in your vector store, or make sure that collection name contains only alphanumeric characters',
				});
			}
			throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
		}
	},
}) {}
