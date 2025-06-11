import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { MongoDBAtlasVectorSearchLibArgs } from '@langchain/mongodb';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { metadataFilterField } from '@utils/sharedFields';
import { MongoClient } from 'mongodb';
import {
	type ILoadOptionsFunctions,
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

const mongoCollectionRLC: INodeProperties = {
	displayName: 'MongoDB Collection',
	name: 'mongoCollection',
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
	name: 'vectorIndexName',
	type: 'string',
	default: '',
	description: 'The name of the vector index',
	required: true,
};

const embeddingField: INodeProperties = {
	displayName: 'Embedding',
	name: 'embedding',
	type: 'string',
	default: 'embedding',
	description: 'The field with the embedding array',
	required: true,
};

const metadataField: INodeProperties = {
	displayName: 'Metadata Field',
	name: 'metadata_field',
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

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [mongoNamespaceField, metadataFilterField],
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
};

/**
 * Constants for the name of the credentials and Node parameters.
 */
export const MONGODB_CREDENTIALS = 'mongoDb';
export const MONGODB_COLLECTION_NAME = 'mongoCollection';
export const VECTOR_INDEX_NAME = 'vectorIndexName';
export const EMBEDDING_NAME = 'embedding';
export const METADATA_FIELD_NAME = 'metadata_field';

/**
 * Type used for cleaner, more intentional typing.
 */
type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

/**
 * Get the mongo client.
 * @param context - The context.
 * @returns the MongoClient for the node.
 */
export async function getMongoClient(context: any) {
	const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
	const connectionString = credentials.connectionString as string;
	if (!mongoConfig.client || mongoConfig.connectionString !== connectionString) {
		if (mongoConfig.client) {
			await mongoConfig.client.close();
		}

		mongoConfig.connectionString = connectionString;
		mongoConfig.client = new MongoClient(connectionString, {
			appName: 'devrel.integration.n8n_vector_integ',
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
	const client = await getMongoClient(this);
	const db = await getDatabase(this, client);
	try {
		const collections = await db.listCollections().toArray();
		const results = collections.map((collection) => ({
			name: collection.name,
			value: collection.name,
		}));

		return { results };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Error: ${error.message}`);
	} finally {
		await client.close();
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

/**
 * Convenience method to get all the required field names in one shot.
 * @param context - The context.
 * @param itemIndex - The index.
 * @returns The field names.
 */
function getFieldNames(context: IFunctionsContext, itemIndex: number) {
	return {
		collectionName: getCollectionName(context, itemIndex),
		mongoVectorIndexName: getVectorIndexName(context, itemIndex),
		embeddingFieldName: getEmbeddingFieldName(context, itemIndex),
		metadataFieldName: getMetadataFieldName(context, itemIndex),
	};
}

/**
 * The MongoClient on the collection needs to be accessible in order to close it properly
 * when the node needs to release the client. We extend the class here to add access.
 */
class ExtendedMongoDBAtlasVectorSearch extends MongoDBAtlasVectorSearch {
	client: MongoClient;

	constructor(embeddings: EmbeddingsInterface, args: MongoDBAtlasVectorSearchLibArgs) {
		super(embeddings, args);
		// @ts-expect-error Client exists on the collection, it's flagged as internal.
		this.client = args.collection.client as MongoClient;
	}
}

/**
 * The MongoDB Atlas Vector Store node.
 */
export class VectorStoreMongoDBAtlas extends createVectorStoreNode<ExtendedMongoDBAtlasVectorSearch>(
	{
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
			const client = await getMongoClient(context);
			try {
				const db = await getDatabase(context, client);
				const { collectionName, mongoVectorIndexName, embeddingFieldName, metadataFieldName } =
					getFieldNames(context, itemIndex);

				const collection = db.collection(collectionName);

				// test index exists
				const indexes = await collection.listSearchIndexes().toArray();

				const indexExists = indexes.some((index) => index.name === mongoVectorIndexName);

				if (!indexExists) {
					throw new NodeOperationError(
						context.getNode(),
						`Index ${mongoVectorIndexName} not found`,
						{
							itemIndex,
							description: 'Please check that the index exists in your collection',
						},
					);
				}

				return new ExtendedMongoDBAtlasVectorSearch(embeddings, {
					collection,
					indexName: mongoVectorIndexName, // Default index name
					textKey: metadataFieldName, // Field containing raw text
					embeddingKey: embeddingFieldName, // Field containing embeddings
				});
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
			const client = await getMongoClient(context);
			try {
				const db = await getDatabase(context, client);
				const { collectionName, mongoVectorIndexName, embeddingFieldName, metadataFieldName } =
					getFieldNames(context, itemIndex);

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
		releaseVectorStoreClient(vectorStore) {
			void vectorStore.client?.close();
		},
	},
) {}
