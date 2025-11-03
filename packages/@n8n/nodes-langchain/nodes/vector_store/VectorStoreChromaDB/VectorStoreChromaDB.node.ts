import { Chroma, ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import type { Document } from '@langchain/core/documents';
import {
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { ChromaClient, CloudClient, type Collection } from 'chromadb';
import { metadataFilterField } from '@utils/sharedFields';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

/**
 * Gets ChromaDB client configuration from credentials
 * Returns either ChromaClient or CloudClient based on deployment type
 */
async function getChromaClient(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
	itemIndex?: number,
): Promise<ChromaClient | CloudClient> {
	const credentials = await context.getCredentials('chromaApi', itemIndex);
	const deploymentType = credentials.deploymentType as string;

	if (deploymentType === 'cloud') {
		// Use CloudClient for Chroma Cloud
		const config: {
			apiKey: string;
			tenant?: string;
			database?: string;
		} = {
			apiKey: credentials.cloudApiKey as string,
		};

		// Add optional tenant and database if provided
		if (credentials.tenant) {
			config.tenant = credentials.tenant as string;
		}
		if (credentials.database) {
			config.database = credentials.database as string;
		}

		return new CloudClient(config);
	} else {
		// Use ChromaClient for self-hosted instances
		const baseUrl = credentials.baseUrl as string;
		const authentication = credentials.authentication as string;

		const url = new URL(baseUrl);

		const config: {
			host: string;
			port: number;
			ssl: boolean;
			headers?: Record<string, string>;
		} = {
			host: url.hostname,
			port: url.port ? parseInt(url.port, 10) : 8000,
			ssl: url.protocol === 'https:',
		};

		if (authentication === 'apiKey' && credentials.apiKey) {
			config.headers = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		} else if (authentication === 'token' && credentials.token) {
			config.headers = {
				'X-Chroma-Token': credentials.token as string,
			};
		}

		return new ChromaClient(config);
	}
}

async function getChromaLibConfig(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
	collectionName: string,
	itemIndex?: number,
): Promise<ChromaLibArgs> {
	const credentials = await context.getCredentials('chromaApi', itemIndex);
	const deploymentType = credentials.deploymentType as string;

	if (deploymentType === 'cloud') {
		// Configuration for Chroma Cloud
		const config: ChromaLibArgs = {
			collectionName,
			clientParams: {
				apiKey: credentials.cloudApiKey as string,
			},
		};

		if (credentials.tenant) {
			config.clientParams = {
				...config.clientParams,
				tenant: credentials.tenant as string,
			};
		}
		if (credentials.database) {
			config.clientParams = {
				...config.clientParams,
				database: credentials.database as string,
			};
		}

		return config;
	} else {
		// Configuration for self-hosted ChromaDB
		const baseUrl = credentials.baseUrl as string;
		const authentication = credentials.authentication as string;

		const url = new URL(baseUrl);

		const clientParams: {
			host: string;
			port: number;
			ssl: boolean;
			headers?: Record<string, string>;
		} = {
			host: url.hostname,
			port: url.port ? parseInt(url.port, 10) : 8000,
			ssl: url.protocol === 'https:',
		};

		if (authentication === 'apiKey' && credentials.apiKey) {
			clientParams.headers = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		} else if (authentication === 'token' && credentials.token) {
			clientParams.headers = {
				'X-Chroma-Token': credentials.token as string,
			};
		}

		const config: ChromaLibArgs = {
			collectionName,
			clientParams,
		};

		return config;
	}
}

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

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
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
		credentials: [
			{
				name: 'chromaApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: {
			chromaCollectionsSearch: async function (this: ILoadOptionsFunctions) {
				try {
					const client = await getChromaClient(this);
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
					const errorMessage = error?.message || String(error);

					// Check for connection errors
					if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to connect')) {
						throw new Error(
							'Cannot connect to ChromaDB. Please ensure ChromaDB is running and accessible at the configured URL.',
						);
					}

					// Check for authentication errors
					if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
						throw new Error(
							'Authentication failed. Please check your API key or token in the credentials.',
						);
					}

					console.error('ChromaDB collection listing error:', error);
					throw new Error(`Failed to list ChromaDB collections: ${errorMessage}`);
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

		try {
			const config = await getChromaLibConfig(context, collection, itemIndex);
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
			clearCollection?: boolean;
		};

		if (options.clearCollection) {
			try {
				const client = await getChromaClient(context, itemIndex);
				await client.deleteCollection({ name: collection });
				context.logger.info(`Collection ${collection} deleted`);
			} catch (error) {
				context.logger.info(
					`Collection ${collection} does not exist yet or could not be deleted (continuing)`,
				);
			}
		}

		try {
			const config = await getChromaLibConfig(context, collection, itemIndex);
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
