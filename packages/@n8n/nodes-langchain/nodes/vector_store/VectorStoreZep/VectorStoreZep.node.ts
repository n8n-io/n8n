import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { IZepConfig } from '@langchain/community/vectorstores/zep';
import { ZepVectorStore } from '@langchain/community/vectorstores/zep';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';

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

export const VectorStoreZep = createVectorStoreNode({
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

		const credentials = (await context.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const zepConfig: IZepConfig = {
			apiUrl: credentials.apiUrl,
			apiKey: credentials.apiKey,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			metadata: filter,
		};

		return new ZepVectorStore(embeddings, zepConfig);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;
		const options =
			(context.getNodeParameter('options', itemIndex) as {
				isAutoEmbedded?: boolean;
				embeddingDimensions?: number;
			}) || {};

		const credentials = (await context.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const zepConfig = {
			apiUrl: credentials.apiUrl,
			apiKey: credentials.apiKey,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			isAutoEmbedded: options.isAutoEmbedded ?? true,
		};

		try {
			await ZepVectorStore.fromDocuments(documents, embeddings, zepConfig);
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
});
