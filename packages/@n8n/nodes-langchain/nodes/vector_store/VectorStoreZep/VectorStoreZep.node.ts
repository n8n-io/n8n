import type { INodeProperties } from 'n8n-workflow';
import type { IZepConfig } from 'langchain/vectorstores/zep';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import type { VectorStore } from 'langchain/vectorstores/base';
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

		ZepVectorStore.fromDocuments(documents, embeddings, zepConfig) as Promise<VectorStore>;
	},
});
