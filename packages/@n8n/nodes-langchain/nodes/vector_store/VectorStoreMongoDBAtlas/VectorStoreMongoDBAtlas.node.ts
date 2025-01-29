import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { MongoClient } from 'mongodb';
import { NodeOperationError, type INodeProperties } from 'n8n-workflow';

import { metadataFilterField } from '@utils/sharedFields';
import {
	mongoCollectionRLC,
	embeddingField,
	metadataField,
	vectorIndexName,
} from '../shared/descriptions';
import { mongoCollectionSearch } from '../shared/methods/listSearch';

import { createVectorStoreNode } from '../shared/createVectorStoreNode';

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
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		try {
			const collectionName = context.getNodeParameter('mongoCollection', itemIndex, '', {
				extractValue: true,
			}) as string;

			const vectorIndexName = context.getNodeParameter('vectorIndexName', itemIndex, '', {
				extractValue: true,
			}) as string;

			const embeddingField = context.getNodeParameter('embedding', itemIndex, '', {
				extractValue: true,
			}) as string;

			const metadataField = context.getNodeParameter('metadata_field', itemIndex, '', {
				extractValue: true,
			}) as string;

			const credentials = await context.getCredentials('mongoDb');
			const client = new MongoClient(credentials.connectionString as string, {
				appName: 'devrel.content.n8n_vector_integ', // Added appName
			});
			await client.connect();
			const collection = client.db(credentials.database as string).collection(collectionName);

			// test index exists
			const indexes = await collection.listSearchIndexes().toArray();

			const indexExists = indexes.some((index) => index.name === vectorIndexName);

			if (!indexExists) {
				throw new NodeOperationError(context.getNode(), `Index ${vectorIndexName} not found`, {
					itemIndex,
					description: 'Please check that the index exists in your collection',
				});
			}

			return new MongoDBAtlasVectorSearch(embeddings, {
				collection,
				indexName: vectorIndexName, // Default index name
				textKey: metadataField, // Field containing raw text
				embeddingKey: embeddingField, // Field containing embeddings
			});
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		try {
			const collectionName = context.getNodeParameter('mongoCollection', itemIndex, '', {
				extractValue: true,
			}) as string;
			const embeddingField = context.getNodeParameter('embedding', itemIndex, '', {
				extractValue: true,
			}) as string;

			const metadataField = context.getNodeParameter('metadata_field', itemIndex, '', {
				extractValue: true,
			}) as string;

			const vectorIndexName = context.getNodeParameter('vectorIndexName', itemIndex, '', {
				extractValue: true,
			}) as string;

			const credentials = await context.getCredentials('mongoDb');

			const client = new MongoClient(credentials.connectionString as string, {
				appName: 'devrel.content.n8n_vector_integ', // Added appName
			});
			await client.connect();

			const db = client.db(credentials.database as string);
			const collection = db.collection(collectionName);

			// Check if collection exists
			const collections = await db.listCollections({ name: collectionName }).toArray();
			if (collections.length === 0) {
				db.createCollection(collectionName);
			}

			await MongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
				collection,
				indexName: vectorIndexName, // Default index name
				textKey: metadataField, // Field containing raw text
				embeddingKey: embeddingField, // Field containing embeddings
			});

			await client.close();
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your MongoDB Atlas connection details',
			});
		}
	},
}) {}
