import { Document as LangChainDocument } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { MongoDBAtlasVectorSearch, type MongoDBAtlasVectorSearchLibArgs } from '@langchain/mongodb';
import { type Collection, type Document as MongoDocument, MongoClient } from 'mongodb';
import {
	type IDataObject,
	type ILoadOptionsFunctions,
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { metadataFilterField, createVectorStoreNode } from '@n8n/ai-utilities';

import { validateAndResolveMongoCredentials } from 'n8n-nodes-base/dist/nodes/MongoDb/GenericFunctions';

/**
 * Constants for the name of the credentials and Node parameters.
 */
export const MONGODB_CREDENTIALS = 'mongoDb';
export const MONGODB_COLLECTION_NAME = 'mongoCollection';
export const VECTOR_INDEX_NAME = 'vectorIndexName';
export const EMBEDDING_NAME = 'embedding';
export const METADATA_FIELD_NAME = 'metadata_field';
export const PRE_FILTER_NAME = 'preFilter';
export const POST_FILTER_NAME = 'postFilterPipeline';

const documentDbEndpointCache = new WeakMap<MongoClient, Promise<boolean>>();

const mongoCollectionRLC: INodeProperties = {
	displayName: 'MongoDB Collection',
	name: MONGODB_COLLECTION_NAME,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'mongoCollectionSearch', // Method to fetch collections
			},
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. my_collection',
		},
	],
};

const vectorIndexName: INodeProperties = {
	displayName: 'Vector Index Name',
	name: VECTOR_INDEX_NAME,
	type: 'string',
	default: '',
	description: 'The name of the vector index',
	required: true,
};

const embeddingField: INodeProperties = {
	displayName: 'Embedding',
	name: EMBEDDING_NAME,
	type: 'string',
	default: 'embedding',
	description: 'The field with the embedding array',
	required: true,
};

const metadataField: INodeProperties = {
	displayName: 'Metadata Field',
	name: METADATA_FIELD_NAME,
	type: 'string',
	default: 'text',
	description: 'The text field of the raw data',
	required: true,
};

const sharedFields: INodeProperties[] = [
	mongoCollectionRLC,
	embeddingField,
	metadataField,
	vectorIndexName,
];

const mongoNamespaceField: INodeProperties = {
	displayName: 'Namespace',
	name: 'namespace',
	type: 'string',
	description: 'Logical partition for documents. Uses metadata.namespace field for filtering.',
	default: '',
};

const preFilterField: INodeProperties = {
	displayName: 'Pre Filter',
	name: PRE_FILTER_NAME,
	type: 'json',
	typeOptions: {
		alwaysOpenEditWindow: true,
	},
	default: '',
	placeholder: '{ "key": "value" }',
	hint: 'This is a filter applied in the $vectorSearch stage <a href="https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#atlas-vector-search-pre-filter">here</a>',
	required: true,
	description: 'MongoDB Atlas Vector Search pre-filter',
};

const postFilterField: INodeProperties = {
	displayName: 'Post Filter Pipeline',
	name: POST_FILTER_NAME,
	type: 'json',
	typeOptions: {
		alwaysOpenEditWindow: true,
	},
	default: '',
	placeholder: '[{ "$match": { "$gt": "1950-01-01" }, ... }]',
	hint: 'Learn more about aggregation pipeline <a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/">here</a>',
	required: true,
	description: 'MongoDB aggregation pipeline in JSON format',
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [mongoNamespaceField, metadataFilterField, preFilterField, postFilterField],
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
				displayName: 'Clear Namespace',
				name: 'clearNamespace',
				type: 'boolean',
				default: false,
				description: 'Whether to clear documents in the namespace before inserting new data',
			},
			mongoNamespaceField,
		],
	},
];

/**
 * Type used for cleaner, more intentional typing.
 */
type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

/**
 * Create a fresh MongoClient for the given context.
 * Each call creates a new client to avoid connection pool sharing across executions.
 * @param context - The context.
 * @param version - The node version.
 * @returns A new, connected MongoClient.
 */
export async function createMongoClient(
	context: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions,
	version: number,
) {
	const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
	const node = context.getNode();
	const { connectionString } = validateAndResolveMongoCredentials(node, credentials);

	const client = new MongoClient(connectionString, {
		appName: 'devrel.integration.n8n_vector_integ',
		driverInfo: {
			name: 'n8n_vector',
			version: version.toString(),
		},
	});
	await client.connect();
	return client;
}

/**
 * Get the database object from the MongoClient by the configured name.
 * @param context - The context.
 * @returns the Db object.
 */
export async function getDatabase(context: IFunctionsContext, client: MongoClient) {
	const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
	return client.db(credentials.database as string);
}

export async function isDocumentDbEndpoint(client: MongoClient): Promise<boolean> {
	const cachedResult = documentDbEndpointCache.get(client);
	if (cachedResult) return await cachedResult;

	const result = client
		.db('admin')
		.command({ hello: 1 })
		.then((response) => {
			const internal = response.internal;
			if (typeof internal !== 'object' || internal === null) return false;

			const kind =
				'kind' in internal && typeof internal.kind === 'string' ? internal.kind.toLowerCase() : '';
			const versions = 'documentdb_versions' in internal ? internal.documentdb_versions : undefined;
			return kind === 'azuredocumentdb' || Array.isArray(versions);
		})
		.catch(() => false);

	documentDbEndpointCache.set(client, result);
	return await result;
}

export async function hasVectorIndex(
	collection: Collection,
	indexName: string,
	isDocumentDb: boolean,
): Promise<boolean> {
	if (isDocumentDb) return true;

	const indexes = await collection.listSearchIndexes().toArray();
	return indexes.some((index) => index.name === indexName);
}

/**
 * Get all the collection in the database.
 * @param this The load options context.
 * @returns The list of collections.
 */
export async function getCollections(this: ILoadOptionsFunctions) {
	const client = await createMongoClient(this, this.getNode().typeVersion);
	try {
		const db = await getDatabase(this, client);
		const collections = await db.listCollections().toArray();
		const results = collections.map((collection) => ({
			name: collection.name,
			value: collection.name,
		}));

		return { results };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Error: ${error.message}`);
	} finally {
		void client.close().catch(() => {});
	}
}

/**
 * Get a parameter from the context.
 * @param key - The key of the parameter.
 * @param context - The context.
 * @param itemIndex - The index.
 * @returns The value.
 */
export function getParameter(key: string, context: IFunctionsContext, itemIndex: number): string {
	const value = context.getNodeParameter(key, itemIndex, '', {
		extractValue: true,
	}) as string;
	if (typeof value !== 'string') {
		throw new NodeOperationError(context.getNode(), `Parameter ${key} must be a string`);
	}
	return value;
}

export const getCollectionName = getParameter.bind(null, MONGODB_COLLECTION_NAME);
export const getVectorIndexName = getParameter.bind(null, VECTOR_INDEX_NAME);
export const getEmbeddingFieldName = getParameter.bind(null, EMBEDDING_NAME);
export const getMetadataFieldName = getParameter.bind(null, METADATA_FIELD_NAME);

export function getFilterValue<T>(
	name: string,
	context: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
): T | undefined {
	const options: IDataObject = context.getNodeParameter('options', itemIndex, {});

	if (options[name]) {
		if (typeof options[name] === 'string') {
			try {
				return JSON.parse(options[name]);
			} catch (error) {
				throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
					itemIndex,
					description: `Could not parse JSON for ${name}`,
				});
			}
		}
		throw new NodeOperationError(context.getNode(), 'Error: No JSON string provided.', {
			itemIndex,
			description: `Could not parse JSON for ${name}`,
		});
	}

	return undefined;
}

export class ExtendedMongoDBAtlasVectorSearch extends MongoDBAtlasVectorSearch {
	mongoClient: MongoClient;
	preFilter: IDataObject;
	postFilterPipeline?: IDataObject[];
	private readonly documentCollection: Collection;
	private readonly embeddingFieldName: string;
	private readonly metadataFieldName: string;
	private readonly isDocumentDb: boolean;

	constructor(
		embeddings: EmbeddingsInterface,
		options: MongoDBAtlasVectorSearchLibArgs,
		mongoClient: MongoClient,
		preFilter: IDataObject,
		postFilterPipeline?: IDataObject[],
		isDocumentDb = false,
	) {
		super(embeddings, options);
		this.mongoClient = mongoClient;
		this.preFilter = preFilter;
		this.postFilterPipeline = postFilterPipeline;
		this.documentCollection = options.collection;
		this.embeddingFieldName = options.embeddingKey ?? 'embedding';
		this.metadataFieldName = options.textKey ?? 'text';
		this.isDocumentDb = isDocumentDb;
	}

	async similaritySearchVectorWithScore(query: number[], k: number) {
		if (this.isDocumentDb) {
			const vectorSearch: MongoDocument = {
				queryVector: MongoDBAtlasVectorSearch.fixArrayPrecision(query),
				path: this.embeddingFieldName,
				limit: k,
				numCandidates: 10 * k,
			};
			if (Object.keys(this.preFilter).length > 0) {
				vectorSearch.filter = this.preFilter;
			}

			const results = await this.documentCollection
				.aggregate([
					{ $vectorSearch: vectorSearch },
					{ $set: { score: { $meta: 'vectorSearchScore' } } },
					{ $project: { [this.embeddingFieldName]: 0 } },
					...(this.postFilterPipeline ?? []),
				])
				.toArray();

			return results.map((result) => {
				const { score, [this.metadataFieldName]: text, ...metadata } = result;
				return [
					new LangChainDocument({
						pageContent: typeof text === 'string' ? text : '',
						metadata,
					}),
					typeof score === 'number' ? score : 0,
				] as [LangChainDocument, number];
			});
		}

		const mergedFilter: MongoDBAtlasVectorSearch['FilterType'] = {
			preFilter: this.preFilter,
			postFilterPipeline: this.postFilterPipeline,
		};
		return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
	}
}

export class VectorStoreMongoDBAtlas extends createVectorStoreNode({
	meta: {
		displayName: 'MongoDB Atlas Vector Store',
		name: 'vectorStoreMongoDBAtlas',
		description: 'Work with your data in MongoDB Atlas or DocumentDB Vector Store',
		icon: { light: 'file:mongodb.svg', dark: 'file:mongodb.dark.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremongodbatlas/',
		credentials: [
			{
				name: 'mongoDb',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: { listSearch: { mongoCollectionSearch: getCollections } },
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const client = await createMongoClient(context, context.getNode().typeVersion);
		try {
			const db = await getDatabase(context, client);
			const collectionName = getCollectionName(context, itemIndex);
			const mongoVectorIndexName = getVectorIndexName(context, itemIndex);
			const embeddingFieldName = getEmbeddingFieldName(context, itemIndex);
			const metadataFieldName = getMetadataFieldName(context, itemIndex);

			const collection = db.collection(collectionName);
			const isDocumentDb = await isDocumentDbEndpoint(client);

			if (!(await hasVectorIndex(collection, mongoVectorIndexName, isDocumentDb))) {
				throw new NodeOperationError(context.getNode(), `Index ${mongoVectorIndexName} not found`, {
					itemIndex,
					description: 'Please check that the index exists in your collection',
				});
			}
			const preFilter = getFilterValue<IDataObject>(PRE_FILTER_NAME, context, itemIndex);
			const postFilterPipeline = getFilterValue<IDataObject[]>(
				POST_FILTER_NAME,
				context,
				itemIndex,
			);

			return new ExtendedMongoDBAtlasVectorSearch(
				embeddings,
				{
					collection,
					indexName: mongoVectorIndexName, // Default index name
					textKey: metadataFieldName, // Field containing raw text
					embeddingKey: embeddingFieldName, // Field containing embeddings
				},
				client,
				preFilter ?? {},
				postFilterPipeline,
				isDocumentDb,
			);
		} catch (error) {
			void client.close().catch(() => {});
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const client = await createMongoClient(context, context.getNode().typeVersion);
		try {
			const db = await getDatabase(context, client);
			const collectionName = getCollectionName(context, itemIndex);
			const mongoVectorIndexName = getVectorIndexName(context, itemIndex);
			const embeddingFieldName = getEmbeddingFieldName(context, itemIndex);
			const metadataFieldName = getMetadataFieldName(context, itemIndex);

			// Check if collection exists
			const collections = await db.listCollections({ name: collectionName }).toArray();
			if (collections.length === 0) {
				await db.createCollection(collectionName);
			}
			const collection = db.collection(collectionName);
			await ExtendedMongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
				collection,
				indexName: mongoVectorIndexName, // Default index name
				textKey: metadataFieldName, // Field containing raw text
				embeddingKey: embeddingFieldName, // Field containing embeddings
			});
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		} finally {
			void client.close().catch(() => {});
		}
	},

	releaseVectorStoreClient(vectorStore) {
		void vectorStore.mongoClient?.close().catch(() => {});
	},
}) {}
