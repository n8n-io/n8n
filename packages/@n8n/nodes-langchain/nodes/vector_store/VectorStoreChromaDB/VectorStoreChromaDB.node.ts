import type { ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import type { Document } from '@langchain/core/documents';
import { ChromaClient, CloudClient, type Collection } from 'chromadb';
import {
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
	NodeApiError,
	ApplicationError,
} from 'n8n-workflow';

import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

interface ChromaError extends Error {
	response?: {
		data?: {
			detail?: string;
		};
	};
}

/**
 * Gets the credential type based on what credentials are actually configured on the node
 * Falls back to the authentication parameter if no credentials are found
 */
function getCredentialType(
	context: IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions,
): string {
	try {
		const authentication = context.getNodeParameter('authentication', 0);
		if (typeof authentication === 'string') {
			return authentication;
		}
	} catch (error) {
		// Fallback to credentials if parameter retrieval fails
	}

	const node = context.getNode();

	// Check which credential type is actually configured on the node
	if (node.credentials?.chromaCloudApi) {
		return 'chromaCloudApi';
	}
	if (node.credentials?.chromaSelfHostedApi) {
		return 'chromaSelfHostedApi';
	}

	return 'chromaSelfHostedApi';
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
		const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey : '';
		const config: {
			apiKey: string;
			tenant?: string;
			database?: string;
		} = {
			apiKey,
		};

		// Add optional tenant and database if provided
		if (typeof credentials.tenant === 'string') {
			config.tenant = credentials.tenant;
		}
		if (typeof credentials.database === 'string') {
			config.database = credentials.database;
		}

		return new CloudClient(config);
	} else {
		// Use ChromaClient for self-hosted instances
		const baseUrl = typeof credentials.baseUrl === 'string' ? credentials.baseUrl : '';
		const authentication =
			typeof credentials.authentication === 'string' ? credentials.authentication : '';

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

		if (authentication === 'apiKey' && typeof credentials.apiKey === 'string') {
			config.headers = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		} else if (authentication === 'token' && typeof credentials.token === 'string') {
			config.headers = {
				'X-Chroma-Token': credentials.token,
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
		const cloudClientParams: {
			apiKey: string;
			tenant?: string;
			database?: string;
		} = {
			apiKey: typeof credentials.apiKey === 'string' ? credentials.apiKey : '',
		};

		if (typeof credentials.tenant === 'string') {
			cloudClientParams.tenant = credentials.tenant;
		}
		if (typeof credentials.database === 'string') {
			cloudClientParams.database = credentials.database;
		}

		const config: ChromaLibArgs = {
			collectionName,
			clientParams: cloudClientParams as ChromaLibArgs['clientParams'],
		};

		return config;
	} else {
		// Configuration for self-hosted ChromaDB
		const baseUrl = typeof credentials.baseUrl === 'string' ? credentials.baseUrl : '';
		const authentication =
			typeof credentials.authentication === 'string' ? credentials.authentication : '';

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

		if (authentication === 'apiKey' && typeof credentials.apiKey === 'string') {
			clientParams.headers = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		} else if (authentication === 'token' && typeof credentials.token === 'string') {
			clientParams.headers = {
				'X-Chroma-Token': credentials.token,
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

				// Check if this is a Cloud
				if ('apiKey' in clientParams && typeof clientParams.apiKey === 'string') {
					// Use CloudClient for Chroma Cloud
					this.index = new CloudClient({
						apiKey: clientParams.apiKey,
						tenant: typeof clientParams.tenant === 'string' ? clientParams.tenant : undefined,
						database: typeof clientParams.database === 'string' ? clientParams.database : undefined,
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
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new ApplicationError(`Chroma getOrCreateCollection error: ${message}`);
			}
		}

		if (!this.collection) {
			throw new ApplicationError('Failed to initialize Chroma collection');
		}

		return this.collection;
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: this['FilterType'],
	): Promise<Array<[Document, number]>> {
		// Handle the case where query might actually be a nested array which is usually the case.

		let flatQuery: number[] = [];

		if (query.length > 0 && Array.isArray(query[0])) {
			// If the first element is an array, we need to flatten
			for (const element of query) {
				if (Array.isArray(element)) {
					flatQuery.push.apply(flatQuery, element);
				} else {
					flatQuery.push(element);
				}
			}
		} else {
			flatQuery = query;
		}

		return await super.similaritySearchVectorWithScore(flatQuery, k, filter);
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
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: {
			async chromaCollectionsSearch(this: ILoadOptionsFunctions) {
				try {
					const client = await getChromaClient(this);
					const collections = await client.listCollections();

					if (Array.isArray(collections)) {
						const results = collections.map((collection: Collection) => ({
							name: collection.name,
							value: collection.name,
						}));
						return { results };
					}

					return { results: [] };
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);

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
		});

		if (typeof collection !== 'string') {
			throw new NodeOperationError(context.getNode(), 'Collection must be a string');
		}

		try {
			const config = await getChromaLibConfig(context, collection, itemIndex);
			return await ExtendedChroma.fromExistingCollection(embeddings, config);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new NodeOperationError(context.getNode(), `Error connecting to ChromaDB: ${message}`, {
				itemIndex,
			});
		}
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collection = context.getNodeParameter('chromaCollection', itemIndex, '', {
			extractValue: true,
		});

		if (typeof collection !== 'string') {
			throw new NodeOperationError(context.getNode(), 'Collection must be a string');
		}

		const options = context.getNodeParameter('options', itemIndex, {});
		const clearCollection = options.clearCollection === true;

		if (clearCollection) {
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
			const chromaError = error as ChromaError;
			const errorMessage = chromaError.message ?? 'Unknown error';
			const detailMessage = chromaError.response?.data?.detail;

			// Handle dimension mismatch error specifically
			if (
				errorMessage.includes('embedding with dimension') ||
				detailMessage?.includes('embedding with dimension')
			) {
				const displayMessage = detailMessage ?? errorMessage;
				throw new NodeOperationError(
					context.getNode(),
					`ChromaDB embedding dimension mismatch: ${displayMessage}`,
					{
						itemIndex,
						description:
							'The collection expects embeddings with different dimensions. Enable "Clear Collection" option to recreate the collection with correct dimensions, or use a different collection name.',
					},
				);
			}
			throw new NodeOperationError(
				context.getNode(),
				`Error inserting documents into ChromaDB: ${errorMessage}`,
				{ itemIndex },
			);
		}
	},
}) {}
