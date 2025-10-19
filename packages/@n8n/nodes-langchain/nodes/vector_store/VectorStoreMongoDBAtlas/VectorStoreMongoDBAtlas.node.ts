import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { MongoDBAtlasVectorSearch, type MongoDBAtlasVectorSearchLibArgs } from '@langchain/mongodb';
import { MongoClient } from 'mongodb';
import {
	type IDataObject,
	type ILoadOptionsFunctions,
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

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

export const mongoConfig = {
	client: null as MongoClient | null,
	connectionString: '',
	nodeVersion: 0,
};

/**
 * Type used for cleaner, more intentional typing.
 */
type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

/**
 * Get the mongo client.
 * @param context - The context.
 * @returns the MongoClient for the node.
 */
export async function getMongoClient(context: any, version: number) {
	const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
	const connectionString = credentials.connectionString as string;
	if (
		!mongoConfig.client ||
		mongoConfig.connectionString !== connectionString ||
		mongoConfig.nodeVersion !== version
	) {
		if (mongoConfig.client) {
			await mongoConfig.client.close();
		}

		mongoConfig.connectionString = connectionString;
		mongoConfig.nodeVersion = version;
		mongoConfig.client = new MongoClient(connectionString, {
			appName: 'devrel.integration.n8n_vector_integ',
			driverInfo: {
				name: 'n8n_vector',
				version: version.toString(),
			},
		});
		await mongoConfig.client.connect();
	}
	return mongoConfig.client;
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

/**
 * Get all the collection in the database.
 * @param this The load options context.
 * @returns The list of collections.
 */
export async function getCollections(this: ILoadOptionsFunctions) {
	try {
		const client = await getMongoClient(this, this.getNode().typeVersion);
		const db = await getDatabase(this, client);
		const collections = await db.listCollections().toArray();
		const results = collections.map((collection) => ({
			name: collection.name,
			value: collection.name,
		}));

		return { results };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Error: ${error.message}`);
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

class ExtendedMongoDBAtlasVectorSearch extends MongoDBAtlasVectorSearch {
	preFilter: IDataObject;
	postFilterPipeline?: IDataObject[];

	constructor(
		embeddings: EmbeddingsInterface,
		options: MongoDBAtlasVectorSearchLibArgs,
		preFilter: IDataObject,
		postFilterPipeline?: IDataObject[],
	) {
		super(embeddings, options);
		this.preFilter = preFilter;
		this.postFilterPipeline = postFilterPipeline;
	}

	async similaritySearchVectorWithScore(query: number[], k: number) {
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
		description: 'Work with your data in MongoDB Atlas Vector Store',
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
		try {
			const client = await getMongoClient(context, context.getNode().typeVersion);
			const db = await getDatabase(context, client);
			const collectionName = getCollectionName(context, itemIndex);
			const mongoVectorIndexName = getVectorIndexName(context, itemIndex);
			const embeddingFieldName = getEmbeddingFieldName(context, itemIndex);
			const metadataFieldName = getMetadataFieldName(context, itemIndex);

			const collection = db.collection(collectionName);

			// test index exists
			const indexes = await collection.listSearchIndexes().toArray();

			const indexExists = indexes.some((index) => index.name === mongoVectorIndexName);

			if (!indexExists) {
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
				preFilter ?? {},
				postFilterPipeline,
			);
		} catch (error) {
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
		try {
			const client = await getMongoClient(context, context.getNode().typeVersion);
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
		}
	},
}) {}
