import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';
import type {
	IDataObject,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
} from 'n8n-workflow';

import type { DataAPIClient } from '@datastax/astra-db-ts';
import type { AstraDBCredential } from './AstraDB.utils';
import {
	createAstraDBClient,
	getCollection,
	ensureCollectionExists,
	buildVectorSearchQuery,
	transformDocumentForInsertion,
	extractSimilarityScore,
} from './AstraDB.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { astraDBCollectionsSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { astraDBCollectionRLC } from '../shared/descriptions';

class AstraDBVectorStore extends VectorStore {
	private client: DataAPIClient;
	private endpoint: string;
	private keyspace: string;
	private collectionName: string;
	private textKey: string;

	_vectorstoreType(): string {
		return 'astra_db';
	}

	constructor(
		embeddings: Embeddings,
		client: DataAPIClient,
		endpoint: string,
		keyspace: string,
		collectionName: string,
		textKey: string = 'text',
	) {
		super(embeddings, {});
		this.client = client;
		this.endpoint = endpoint;
		this.keyspace = keyspace;
		this.collectionName = collectionName;
		this.textKey = textKey;
	}

	async addDocuments(documents: Document[]): Promise<void> {
		const collection = await getCollection(
			this.client,
			this.endpoint,
			this.keyspace,
			this.collectionName,
		);

		for (const doc of documents) {
			const transformedDoc = transformDocumentForInsertion(doc.metadata, this.textKey);
			transformedDoc.text = doc.pageContent;

			// Generate embedding for the document
			const embedding = await this.embeddings.embedQuery(doc.pageContent);
			transformedDoc.$vector = embedding;

			await collection.insertOne(transformedDoc);
		}
	}

	async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
		const collection = await getCollection(
			this.client,
			this.endpoint,
			this.keyspace,
			this.collectionName,
		);

		for (let i = 0; i < vectors.length; i++) {
			const doc = documents[i];
			const vector = vectors[i];

			const transformedDoc = transformDocumentForInsertion(doc.metadata, this.textKey);
			transformedDoc.text = doc.pageContent;
			transformedDoc.$vector = vector;

			await collection.insertOne(transformedDoc);
		}
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: IDataObject,
	): Promise<[Document, number][]> {
		const collection = await getCollection(
			this.client,
			this.endpoint,
			this.keyspace,
			this.collectionName,
		);

		const searchQuery = buildVectorSearchQuery(query, k, filter, true);
		const results = await collection.find(searchQuery);

		const documents: [Document, number][] = [];

		// Convert cursor to array for iteration
		const resultsArray = await results.toArray();

		for (const result of resultsArray) {
			const similarity = extractSimilarityScore(result) || 0;
			const pageContent = result.text || result[this.textKey] || '';
			const metadata = { ...result };
			delete metadata.text;
			delete metadata[this.textKey];
			delete metadata.$vector;
			delete metadata.$similarity;
			delete metadata.similarity;

			documents.push([new Document({ pageContent, metadata }), similarity]);
		}

		return documents;
	}

	async delete(params: { ids: string[] }): Promise<void> {
		const collection = await getCollection(
			this.client,
			this.endpoint,
			this.keyspace,
			this.collectionName,
		);

		for (const id of params.ids) {
			await collection.deleteOne({ _id: id });
		}
	}

	static async fromExistingCollection(
		embeddings: Embeddings,
		client: DataAPIClient,
		endpoint: string,
		keyspace: string,
		collectionName: string,
		textKey: string = 'text',
	): Promise<AstraDBVectorStore> {
		return new AstraDBVectorStore(embeddings, client, endpoint, keyspace, collectionName, textKey);
	}

	static async fromDocumentsWithConfig(
		documents: Document[],
		embeddings: Embeddings,
		client: DataAPIClient,
		endpoint: string,
		keyspace: string,
		collectionName: string,
		textKey: string = 'text',
	): Promise<AstraDBVectorStore> {
		const vectorStore = new AstraDBVectorStore(
			embeddings,
			client,
			endpoint,
			keyspace,
			collectionName,
			textKey,
		);
		await vectorStore.addDocuments(documents);
		return vectorStore;
	}

	// Override the base class method to match the expected signature
	static async fromDocuments(
		documents: Document[],
		embeddings: Embeddings,
		dbConfig: any,
	): Promise<AstraDBVectorStore> {
		const { client, endpoint, keyspace, collectionName, textKey } = dbConfig;
		return this.fromDocumentsWithConfig(
			documents,
			embeddings,
			client,
			endpoint,
			keyspace,
			collectionName,
			textKey,
		);
	}
}

const sharedFields: INodeProperties[] = [astraDBCollectionRLC];

const shared_options: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> = [
	{
		displayName: 'Text Key',
		name: 'textKey',
		type: 'string',
		default: 'text',
		validateType: 'string',
		description: 'The key in the document that contains the embedded text',
	},
	{
		displayName: 'Vector Dimension',
		name: 'vectorDimension',
		type: 'number',
		default: 1536,
		validateType: 'number',
		description: 'The dimension of the vector embeddings (required for collection creation)',
	},
	{
		displayName: 'Similarity Metric',
		name: 'similarityMetric',
		type: 'options',
		options: [
			{
				name: 'Cosine',
				value: 'cosine',
			},
			{
				name: 'Euclidean',
				value: 'euclidean',
			},
			{
				name: 'Dot Product',
				value: 'dot_product',
			},
		],
		default: 'cosine',
		description: 'The similarity metric to use for vector search',
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
			...shared_options,
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

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Search Filters',
				name: 'searchFilterJson',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default:
					'{\n  "AND": [\n    {\n        "path": "metadata.source",\n        "operator": "eq",\n        "value": "document.pdf"\n    }\n  ]\n}',
				validateType: 'object',
				description:
					'Filter documents using MongoDB-style query syntax. Use "path" for field name, "operator" for comparison type, and "value" for the value to compare against.',
			},
			{
				displayName: 'Include Similarity Score',
				name: 'includeSimilarity',
				type: 'boolean',
				default: true,
				description: 'Whether to include similarity scores in the results',
			},
			...shared_options,
		],
	},
];

export class VectorStoreAstraDB extends createVectorStoreNode<AstraDBVectorStore>({
	meta: {
		displayName: 'Astra DB Vector Store',
		name: 'vectorStoreAstraDB',
		description: 'Work with your data in an Astra DB collection',
		icon: 'file:astra-db.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreastradb/',
		credentials: [
			{
				name: 'astraDBApi',
				required: true,
			},
		],
	},
	methods: {
		listSearch: { astraDBCollectionsSearch },
	},
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('astraDBCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			textKey?: string;
			vectorDimension?: number;
			similarityMetric?: string;
			includeSimilarity?: boolean;
		};

		const credentials = (await context.getCredentials('astraDBApi')) as AstraDBCredential;

		const client = await createAstraDBClient(credentials);

		// Ensure collection exists with proper vector configuration
		const vectorDimension = options.vectorDimension || 1536;
		await ensureCollectionExists(
			client,
			credentials.endpoint,
			credentials.keyspace,
			collection,
			vectorDimension,
		);

		return await AstraDBVectorStore.fromExistingCollection(
			embeddings,
			client,
			credentials.endpoint,
			credentials.keyspace,
			collection,
			options.textKey || 'text',
		);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('astraDBCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			textKey?: string;
			vectorDimension?: number;
			similarityMetric?: string;
			clearCollection?: boolean;
		};

		const credentials = (await context.getCredentials('astraDBApi')) as AstraDBCredential;

		const client = await createAstraDBClient(credentials);

		// Ensure collection exists with proper vector configuration
		const vectorDimension = options.vectorDimension || 1536;
		const collection = await ensureCollectionExists(
			client,
			credentials.endpoint,
			credentials.keyspace,
			collectionName,
			vectorDimension,
		);

		if (options.clearCollection) {
			// Clear all documents in the collection
			await collection.deleteMany({});
		}

		await AstraDBVectorStore.fromDocumentsWithConfig(
			documents,
			embeddings,
			client,
			credentials.endpoint,
			credentials.keyspace,
			collectionName,
			options.textKey || 'text',
		);
	},
}) {}
