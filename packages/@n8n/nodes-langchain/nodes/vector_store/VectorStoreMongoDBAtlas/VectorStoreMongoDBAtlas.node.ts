import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { MongoClient } from 'mongodb';
import { type ILoadOptionsFunctions, NodeOperationError, type INodeProperties } from 'n8n-workflow';

import { metadataFilterField } from '@utils/sharedFields';

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

export async function getMongoClient(context: any) {
	const credentials = await context.getCredentials('mongoDb');
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

async function mongoClientAndDatabase(context: any) {
	const client = await getMongoClient(context);
	const credentials = await context.getCredentials('mongoDb');
	const db = client.db(credentials.database as string);
	return { client, db };
}

async function mongoCollectionSearch(this: ILoadOptionsFunctions) {
	const { db } = await mongoClientAndDatabase(this);
	try {
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
	methods: { listSearch: { mongoCollectionSearch } },
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		try {
			const { db } = await mongoClientAndDatabase(context);
			try {
				const collectionName = context.getNodeParameter('mongoCollection', itemIndex, '', {
					extractValue: true,
				}) as string;

				const mongoVectorIndexName = context.getNodeParameter('vectorIndexName', itemIndex, '', {
					extractValue: true,
				}) as string;

				const embeddingFieldName = context.getNodeParameter('embedding', itemIndex, '', {
					extractValue: true,
				}) as string;

				const metadataFieldName = context.getNodeParameter('metadata_field', itemIndex, '', {
					extractValue: true,
				}) as string;

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

				return new MongoDBAtlasVectorSearch(embeddings, {
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
				// Don't close the client here to maintain connection pooling
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		try {
			const { db } = await mongoClientAndDatabase(context);
			try {
				const mongoCollectionName = context.getNodeParameter('mongoCollection', itemIndex, '', {
					extractValue: true,
				}) as string;
				const embeddingFieldName = context.getNodeParameter('embedding', itemIndex, '', {
					extractValue: true,
				}) as string;

				const metadataFieldName = context.getNodeParameter('metadata_field', itemIndex, '', {
					extractValue: true,
				}) as string;

				const mongoDBAtlasVectorIndex = context.getNodeParameter('vectorIndexName', itemIndex, '', {
					extractValue: true,
				}) as string;

				// Check if collection exists
				const collections = await db.listCollections({ name: mongoCollectionName }).toArray();
				if (collections.length === 0) {
					await db.createCollection(mongoCollectionName);
				}
				const collection = db.collection(mongoCollectionName);
				await MongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
					collection,
					indexName: mongoDBAtlasVectorIndex, // Default index name
					textKey: metadataFieldName, // Field containing raw text
					embeddingKey: embeddingFieldName, // Field containing embeddings
				});
			} catch (error) {
				throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
					itemIndex,
					description: 'Please check your MongoDB Atlas connection details',
				});
			} finally {
				// Don't close the client here to maintain connection pooling
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		}
	},
}) {}
