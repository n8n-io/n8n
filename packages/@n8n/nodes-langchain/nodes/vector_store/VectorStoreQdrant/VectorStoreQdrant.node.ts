import url from 'url';
import type { INodeProperties } from 'n8n-workflow';
import type { QdrantLibArgs } from 'langchain/vectorstores/qdrant';
import { QdrantVectorStore } from 'langchain/vectorstores/qdrant';
import type { VectorStore } from 'langchain/vectorstores/base';
import { QdrantClient } from '@qdrant/js-client-rest';
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

export const VectorStoreQdrant = createVectorStoreNode({
	meta: {
		displayName: 'Qdrant Vector Store',
		name: 'vectorStoreQdrant',
		description: 'Work with your data in Qdrant Vector Store',
		credentials: [
			{
				name: 'qdrantApi',
				required: true,
			},
		],
		icon: 'file:qdrant.png',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreqdrant/',
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

		const credentials = (await context.getCredentials('qdrantApi')) as {
			apiKey?: string;
			apiUrl: string;
		};
		const parts = url.parse(credentials.apiUrl);

		const qdrantConfig: QdrantLibArgs = {
			collectionName,
			collectionConfig: {
				vectors: {
					size: options.embeddingDimensions ?? 1536,
					distance: 'Cosine',
				},
			},
			client: new QdrantClient({
				apiKey: credentials.apiKey,
				host: parts.hostname ?? undefined,
				port: Number.parseInt(parts.port ?? ''),
			}),
		};

		return new QdrantVectorStore(embeddings, qdrantConfig);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;
		const options =
			(context.getNodeParameter('options', itemIndex) as {
				isAutoEmbedded?: boolean;
				embeddingDimensions?: number;
			}) || {};

		const credentials = (await context.getCredentials('qdrantApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const parts = url.parse(credentials.apiUrl);
		const qdrantConfig: QdrantLibArgs = {
			collectionName,
			collectionConfig: {
				vectors: {
					size: options.embeddingDimensions ?? 1536,
					distance: 'Cosine',
				},
			},
			client: new QdrantClient({
				apiKey: credentials.apiKey,
				host: parts.hostname ?? undefined,
				port: Number.parseInt(parts.port ?? ''),
			}),
		};

		QdrantVectorStore.fromDocuments(documents, embeddings, qdrantConfig) as Promise<VectorStore>;
	},
});
