import { Chroma as ChromaVectorStore } from '@langchain/community/vectorstores/chroma';
import { NodeOperationError, type INodeProperties } from 'n8n-workflow';
import { ChromaClient } from 'chromadb';
import { metadataFilterField } from '@utils/sharedFields';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [chromaCollectionRLC];

const chromaURLField: INodeProperties = {
	displayName: 'Chroma URL',
	name: 'chromaURL',
	type: 'string',
	default: 'http://localhost:8000',
	description: 'URL of the Chroma server',
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [chromaURLField, metadataFilterField],
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
			chromaURLField,
		],
	},
];

export class VectorStoreChromaDB extends createVectorStoreNode<ChromaVectorStore>({
	meta: {
		displayName: 'Chroma Vector Store',
		name: 'vectorStoreChromaDB',
		description: 'Work with your data in Chroma Vector Store',
		icon: { light: 'file:chroma.svg', dark: 'file:chroma.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorechromadb/',
		credentials: [],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: {
			chromaCollectionsSearch: async function () {
				try {
					// Use default ChromaDB configuration
					const client = new ChromaClient();
					const collections = await client.listCollections();

					if (Array.isArray(collections)) {
						const results = collections.map((collection: any) => ({
							name: collection.name || collection,
							value: collection.name || collection,
						}));
						return { results };
					}

					return { results: [] };
				} catch (error) {
					console.error('ChromaDB collection listing error:', error);
					return { results: [] };
				}
			},
		},
	},
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,

	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('chromaCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		// const options = context.getNodeParameter('options', itemIndex, {}) as {
		// 	chromaURL?: string;
		// };

		try {
			// Configure ChromaVectorStore with proper server URL if provided
			const config: any = { collectionName: collection };

			const vectorStore = new ChromaVectorStore(embeddings, config);

			return vectorStore;
		} catch (error: any) {
			throw new NodeOperationError(
				context.getNode(),
				`Error connecting to ChromaDB: ${error?.message || 'Unknown error'}`,
				{ itemIndex },
			);
		}
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collection = context.getNodeParameter('chromaCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			chromaURL?: string;
			clearCollection?: boolean;
		};

		if (options.clearCollection) {
			try {
				// Use proper ChromaDB client configuration
				const clientConfig: any = {};
				if (options.chromaURL) {
					clientConfig.path = options.chromaURL;
				}

				const client = new ChromaClient(clientConfig);
				await client.deleteCollection({ name: collection });
				context.logger.info(`Collection ${collection} deleted`);
			} catch (error) {
				context.logger.info(
					`Collection ${collection} does not exist yet or could not be deleted (continuing)`,
				);
			}
		}

		try {
			// Configure ChromaVectorStore with proper server URL if provided
			const config: any = { collectionName: collection };

			await ChromaVectorStore.fromDocuments(documents, embeddings, config);
		} catch (error: any) {
			// Handle dimension mismatch error specifically
			if (
				error?.message?.includes('embedding with dimension') ||
				error?.response?.data?.detail?.includes('embedding with dimension')
			) {
				const errorMessage = error?.response?.data?.detail || error?.message || error;
				throw new NodeOperationError(
					context.getNode(),
					`ChromaDB embedding dimension mismatch: ${errorMessage}`,
					{
						itemIndex,
						description:
							'The collection expects embeddings with different dimensions. Enable "Clear Collection" option to recreate the collection with correct dimensions, or use a different collection name.',
					},
				);
			}
			throw new NodeOperationError(
				context.getNode(),
				`Error inserting documents into ChromaDB: ${error?.message || 'Unknown error'}`,
				{ itemIndex },
			);
		}
	},
}) {}
