import type { ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import type { Document } from '@langchain/core/documents';
import {
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
	NodeApiError,
	ApplicationError,
} from 'n8n-workflow';
import { ChromaClient, CloudClient, type Collection } from 'chromadb';
import { metadataFilterField } from '@utils/sharedFields';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

/**
 * Gets the credential type based on what credentials are actually configured on the node
 * Falls back to the authentication parameter if no credentials are found
 */
function getCredentialType(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
): string {
	const node = context.getNode();

	// Check which credential type is actually configured on the node
	if (node.credentials?.chromaCloudApi) {
		return 'chromaCloudApi';
	}
	if (node.credentials?.chromaSelfHostedApi) {
		return 'chromaSelfHostedApi';
	}

	// Fallback to authentication parameter
	return context.getNodeParameter('authentication', 0) as string;
}

/**
 * Gets ChromaDB client configuration from credentials
 * Returns either ChromaClient or CloudClient based on credential type
 */
async function getChromaClient(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
	itemIndex?: number,
): Promise<ChromaClient | CloudClient> {
	const credentialType = getCredentialType(context);
	const credentials = await context.getCredentials(credentialType, itemIndex);

	if (credentialType === 'chromaCloudApi') {
		// Use CloudClient for Chroma Cloud
		const config: {
			apiKey: string;
			tenant?: string;
			database?: string;
		} = {
			apiKey: credentials.apiKey as string,
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
/*
 * Returns the config for the Langchain ChromaDB
 */
async function getChromaLibConfig(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
	collectionName: string,
	itemIndex?: number,
): Promise<ChromaLibArgs> {
	const credentialType = getCredentialType(context);
	const credentials = await context.getCredentials(credentialType, itemIndex);

	if (credentialType === 'chromaCloudApi') {
		// Configuration for Chroma Cloud
		const config: ChromaLibArgs = {
			collectionName,
			clientParams: {
				apiKey: credentials.apiKey as string,
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
	async ensureCollection(): Promise<Collection> {
		if (!this.collection) {
			if (!this.index) {
				const clientParams = this.clientParams ?? {};

				// Check if this is a Cloud configuration (has apiKey in clientParams)
				if ('apiKey' in clientParams && clientParams.apiKey) {
					// Use CloudClient for Chroma Cloud
					this.index = new CloudClient({
						apiKey: clientParams.apiKey as string,
						tenant: clientParams.tenant as string | undefined,
						database: clientParams.database as string | undefined,
					});
				} else {
					// Use ChromaClient for self-hosted instances
					const { ChromaClient } = await ExtendedChroma.imports();
					const clientConfig = this.url ? { path: this.url, ...clientParams } : clientParams;

					this.index = new ChromaClient(clientConfig);
				}
			}

			try {
				this.collection = await this.index.getOrCreateCollection({
					name: this.collectionName,
					...(this.collectionMetadata && { metadata: this.collectionMetadata }),
					embeddingFunction: null,
				});
			} catch (err) {
				throw new ApplicationError(`Chroma getOrCreateCollection error: ${err}`);
			}
		}

		return this.collection!;
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: this['FilterType'],
	): Promise<Array<[Document, number]>> {
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

const authenticationProperty: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	options: [
		{
			name: 'Self-Hosted',
			value: 'chromaSelfHostedApi',
			description: 'Connect to a self-hosted ChromaDB instance',
		},
		{
			name: 'Cloud',
			value: 'chromaCloudApi',
			description: 'Connect to Chroma Cloud',
		},
	],
	default: 'chromaSelfHostedApi',
};

const sharedFields: INodeProperties[] = [authenticationProperty, chromaCollectionRLC];

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
				name: 'chromaSelfHostedApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['chromaSelfHostedApi'],
					},
				},
			},
			{
				name: 'chromaCloudApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['chromaCloudApi'],
					},
				},
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: {
			async chromaCollectionsSearch(this: ILoadOptionsFunctions) {
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
						throw new NodeApiError(this.getNode(), {
							message:
								'Cannot connect to ChromaDB. Please ensure ChromaDB is running and accessible at the configured URL.',
						});
					}

					// Check for authentication errors
					if (
						errorMessage.includes('Unauthorized') ||
						errorMessage.includes('401') ||
						errorMessage.includes('403')
					) {
						throw new NodeApiError(this.getNode(), {
							message:
								'Authentication failed. Please check your API key or token in the credentials',
						});
					}

					throw new NodeApiError(this.getNode(), {
						message: `Failed to list ChromaDB collections: ${errorMessage}`,
					});
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
			return await ExtendedChroma.fromExistingCollection(embeddings, config);
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
