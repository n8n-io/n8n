import { Chroma, ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import type { Document } from '@langchain/core/documents';
import { NodeOperationError, type INodeProperties } from 'n8n-workflow';
import { ChromaClient, ChromaClientArgs, type Collection } from 'chromadb';
import { metadataFilterField } from '@utils/sharedFields';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

class ExtendedChroma extends Chroma {
	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: this['FilterType'],
	): Promise<[Document, number][]> {
		// Important: The new version of chromadb expects the query embedding to be an array of embeddings.
		// @ts-ignore
		return await super.similaritySearchVectorWithScore([query], k, filter);
	}
}

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

export class VectorStoreChromaDB extends createVectorStoreNode<ExtendedChroma>({
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
						const results = collections.map((collection: Collection) => ({
							name: collection.name || String(collection),
							value: collection.name || String(collection),
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

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			chromaURL?: string;
		};

		try {
			const config: ChromaLibArgs = { collectionName: collection };

			if (options.chromaURL) {
				config.clientParams = {
					host: new URL(options.chromaURL).hostname,
					port: new URL(options.chromaURL).port
						? parseInt(new URL(options.chromaURL).port, 10)
						: 8000,
				};
			}

			return ExtendedChroma.fromExistingCollection(embeddings, config);
		} catch (error) {
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
				const clientConfig: ChromaClientArgs = {};
				if (options.chromaURL) {
					//Parse the URL to extract host and port
					const url = new URL(options.chromaURL);
					clientConfig.host = url.hostname;
					clientConfig.port = url.port ? parseInt(url.port, 10) : 8000;
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
			const config: ChromaLibArgs = { collectionName: collection };

			if (options.chromaURL) {
				config.clientParams = {
					host: new URL(options.chromaURL).hostname,
					port: new URL(options.chromaURL).port
						? parseInt(new URL(options.chromaURL).port, 10)
						: 8000,
				};
			}

			await ExtendedChroma.fromDocuments(documents, embeddings, config);
		} catch (error) {
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
