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
		const cloudApiKey = credentials.cloudApiKey as string;

		// Validate API key format
		if (!cloudApiKey || typeof cloudApiKey !== 'string' || cloudApiKey.trim().length === 0) {
			throw new Error('Invalid or missing Cloud API key');
		}

		const config: {
			apiKey: string;
			tenant?: string;
			database?: string;
		} = {
			apiKey: cloudApiKey.trim(),
		};

		// Add optional tenant and database if provided (with validation)
		if (credentials.tenant) {
			const tenant = String(credentials.tenant).trim();
			if (tenant.length > 0) {
				config.tenant = tenant;
			}
		}
		if (credentials.database) {
			const database = String(credentials.database).trim();
			if (database.length > 0) {
				config.database = database;
			}
		}

		return new CloudClient(config);
	} else {
		// Use ChromaClient for self-hosted instances
		const baseUrl = credentials.baseUrl as string;
		const authentication = credentials.authentication as string;

		// Validate and parse URL
		if (!baseUrl || typeof baseUrl !== 'string') {
			throw new Error('Invalid or missing base URL');
		}

		let url: URL;
		try {
			url = new URL(baseUrl.trim());
		} catch (error) {
			throw new Error(
				`Invalid base URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}

		// Validate protocol
		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new Error('Base URL must use http:// or https:// protocol');
		}

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
			const apiKey = String(credentials.apiKey).trim();
			if (apiKey.length > 0) {
				config.headers = {
					Authorization: `Bearer ${apiKey}`,
				};
			}
		} else if (authentication === 'token' && credentials.token) {
			const token = String(credentials.token).trim();
			if (token.length > 0) {
				config.headers = {
					'X-Chroma-Token': token,
				};
			}
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

	// Validate collection name
	if (!collectionName || typeof collectionName !== 'string' || collectionName.trim().length === 0) {
		throw new Error('Invalid or missing collection name');
	}

	const sanitizedCollectionName = collectionName.trim();

	if (deploymentType === 'cloud') {
		// Configuration for Chroma Cloud
		const cloudApiKey = credentials.cloudApiKey as string;

		if (!cloudApiKey || typeof cloudApiKey !== 'string' || cloudApiKey.trim().length === 0) {
			throw new Error('Invalid or missing Cloud API key');
		}

		const config: ChromaLibArgs = {
			collectionName: sanitizedCollectionName,
			clientParams: {
				apiKey: cloudApiKey.trim(),
			},
		};

		if (credentials.tenant) {
			const tenant = String(credentials.tenant).trim();
			if (tenant.length > 0) {
				config.clientParams = {
					...config.clientParams,
					tenant,
				};
			}
		}
		if (credentials.database) {
			const database = String(credentials.database).trim();
			if (database.length > 0) {
				config.clientParams = {
					...config.clientParams,
					database,
				};
			}
		}

		return config;
	} else {
		// Configuration for self-hosted ChromaDB
		const baseUrl = credentials.baseUrl as string;
		const authentication = credentials.authentication as string;

		if (!baseUrl || typeof baseUrl !== 'string') {
			throw new Error('Invalid or missing base URL');
		}

		let url: URL;
		try {
			url = new URL(baseUrl.trim());
		} catch (error) {
			throw new Error(
				`Invalid base URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}

		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new Error('Base URL must use http:// or https:// protocol');
		}

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
			const apiKey = String(credentials.apiKey).trim();
			if (apiKey.length > 0) {
				clientParams.headers = {
					Authorization: `Bearer ${apiKey}`,
				};
			}
		} else if (authentication === 'token' && credentials.token) {
			const token = String(credentials.token).trim();
			if (token.length > 0) {
				clientParams.headers = {
					'X-Chroma-Token': token,
				};
			}
		}

		const config: ChromaLibArgs = {
			collectionName: sanitizedCollectionName,
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
		const queryEmbeddings: number[][] = Array.isArray(query[0])
			? (query as unknown as number[][])
			: [query];
		return await super.similaritySearchVectorWithScore(
			queryEmbeddings as unknown as number[],
			k,
			filter,
		);
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
					this.logger.error('ChromaDB collection listing error:', error);

					// Provide user-friendly error
					const errorMessage = error instanceof Error ? error.message : String(error);

					// Check for connection errors
					if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to connect')) {
						throw new Error(
							'Cannot connect to ChromaDB. Please ensure ChromaDB is running and accessible at the configured URL.',
						);
					}

					// Check for authentication errors
					if (
						errorMessage.includes('Unauthorized') ||
						errorMessage.includes('401') ||
						errorMessage.includes('403') ||
						errorMessage.includes('Authentication')
					) {
						throw new Error(
							'Authentication failed. Please check your API key or token in the credentials.',
						);
					}

					// Check for invalid URL errors
					if (errorMessage.includes('Invalid') && errorMessage.includes('URL')) {
						throw new Error(
							'Invalid URL configuration. Please check your base URL in the credentials.',
						);
					}

					// Generic error message without exposing internal details
					throw new Error(
						'Failed to list ChromaDB collections. Please check your configuration and try again.',
					);
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
			context.logger.error('ChromaDB connection error:', error);

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			if (errorMessage.includes('Invalid') || errorMessage.includes('missing')) {
				throw new NodeOperationError(context.getNode(), `Configuration error: ${errorMessage}`, {
					itemIndex,
				});
			}

			throw new NodeOperationError(
				context.getNode(),
				'Failed to connect to ChromaDB. Please verify your credentials and collection name.',
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
				context.logger.info(`Collection deleted successfully`);
			} catch (error) {
				context.logger.debug('Collection does not exist or could not be deleted (continuing)');
			}
		}

		try {
			const config = await getChromaLibConfig(context, collection, itemIndex);
			await ExtendedChroma.fromDocuments(documents, embeddings, config);
		} catch (error) {
			context.logger.error('ChromaDB document insertion error:', error);

			const errorMessage = error instanceof Error ? error.message : String(error);
			const responseDetail = (error as any)?.response?.data?.detail;

			// Handle dimension mismatch error specifically
			if (
				errorMessage.includes('embedding with dimension') ||
				(responseDetail && String(responseDetail).includes('embedding with dimension'))
			) {
				throw new NodeOperationError(
					context.getNode(),
					'ChromaDB embedding dimension mismatch detected.',
					{
						itemIndex,
						description:
							'The collection expects embeddings with different dimensions. Enable "Clear Collection" option to recreate the collection with correct dimensions, or use a different collection name.',
					},
				);
			}

			// Handle configuration errors
			if (errorMessage.includes('Invalid') || errorMessage.includes('missing')) {
				throw new NodeOperationError(context.getNode(), `Configuration error: ${errorMessage}`, {
					itemIndex,
				});
			}

			// Generic error
			throw new NodeOperationError(
				context.getNode(),
				'Failed to insert documents into ChromaDB. Please check your configuration and try again.',
				{ itemIndex },
			);
		}
	},
}) {}
