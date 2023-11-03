import type { INodeProperties } from 'n8n-workflow';
import { QdrantVectorStore } from 'langchain/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Collection Name',
		name: 'collectionName',
		type: 'string',
		default: '',
		required: true,
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Vector Dimension',
				name: 'vectorSize',
				type: 'number',
				default: 1536,
				description:
					'The dimension of the vectors in the vector store. This should match the dimension of the embedded vectors you are inserting.',
			},
			metadataFilterField,
		],
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Clear Collection',
				name: 'clearCollection',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the collection before inserting new data',
			},
			{
				displayName: 'Vector Dimension',
				name: 'vectorSize',
				type: 'number',
				default: 1536,
				description:
					'The dimension of the vectors in the vector store. This should match the dimension of the embedded vectors you are inserting.',
			},
			{
				displayName: 'Similarity',
				name: 'similarity',
				type: 'options',
				description:
					'Determines how the similarity between vectors is calculated. Cosine measures the cosine of the angle between two vectors, Euclid measures the Euclidean distance between two points, and Dot calculates the dot product of two vectors.',
				default: 'cosine',
				options: [
					{
						displayName: 'Cosine',
						name: 'Cosine',
						value: 'Cosine',
					},
					{
						displayName: 'Euclid',
						value: 'Euclid',
						name: 'Euclid',
					},
					{
						displayName: 'Dot',
						value: 'Dot',
						name: 'Dot',
					},
				],
			},
		],
	},
];
export const VectorStoreQdrant = createVectorStoreNode({
	meta: {
		displayName: 'Qdrant Vector Store',
		name: 'vectorStoreQdrant',
		description: 'Work with your data in Qdrant Vector Store',
		icon: 'file:qdrant.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreqdrant/',
		credentials: [
			{
				name: 'qdrantApi',
				required: true,
			},
		],
	},
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	filtersTransform(filters: Record<string, unknown> | undefined) {
		if (!filters) return filters;

		const transformedFilters = {
			must: [] as Array<{ key: string; match: { value: unknown } }>,
		};

		Object.keys(filters).forEach((key) => {
			transformedFilters.must.push({ key: `metadata.${key}`, match: { value: filters[key] } });
		});
		return transformedFilters;
	},
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;
		const vectorSize = context.getNodeParameter('options.vectorSize', itemIndex, 1536) as number;
		const similarity = context.getNodeParameter('options.similarity', itemIndex, 'Cosine') as
			| 'Cosine'
			| 'Euclid'
			| 'Dot';

		const credentials = await context.getCredentials('qdrantApi');
		const client = new QdrantClient({
			apiKey: credentials.apiKey as string,
			host: credentials.clusterHost as string,
		});

		const quadrantVectorStore = QdrantVectorStore.fromExistingCollection(embeddings, {
			client,
			collectionName,
			collectionConfig: {
				vectors: {
					distance: similarity,
					size: vectorSize,
				},
			},
		});

		return quadrantVectorStore;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('collectionName', itemIndex) as string;
		const credentials = await context.getCredentials('qdrantApi');
		const clearCollection = context.getNodeParameter(
			'options.clearCollection',
			itemIndex,
			false,
		) as boolean;
		const vectorSize = context.getNodeParameter('options.vectorSize', itemIndex, 1536) as number;
		const similarity = context.getNodeParameter('options.similarity', itemIndex, 'Cosine') as
			| 'Cosine'
			| 'Euclid'
			| 'Dot';

		const client = new QdrantClient({
			apiKey: credentials.apiKey as string,
			host: credentials.clusterHost as string,
		});

		if (clearCollection) {
			const existingCollection = await client.getCollection(collectionName);
			if (existingCollection) {
				await client.deleteCollection(collectionName);
			}
		}
		await QdrantVectorStore.fromDocuments(documents, embeddings, {
			client,
			collectionName,
			collectionConfig: {
				vectors: {
					distance: similarity,
					size: vectorSize,
				},
			},
		});
	},
});
