import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { MongoClient } from 'mongodb';

import {
	ExtendedMongoDBAtlasVectorSearch,
	getDocumentDbEndpointType,
} from './VectorStoreMongoDBAtlas.node';

const connectionString = process.env.DOCUMENTDB_URI;

describe.runIf(connectionString)('DocumentDB vector search service', () => {
	let client: MongoClient | undefined;
	let connected = false;

	beforeAll(async () => {
		if (!connectionString) throw new Error('DOCUMENTDB_URI is required for service tests');
		client = new MongoClient(connectionString);
		await client.connect();
		connected = true;
	});

	afterAll(async () => {
		if (!client) return;
		try {
			if (connected) await client.db('n8n_vector_e2e').dropDatabase();
		} finally {
			await client.close();
		}
	});

	it('detects DocumentDB and executes native vector search', async () => {
		if (!client) throw new Error('DocumentDB client is not connected');
		const documentDbEndpointType = await getDocumentDbEndpointType(client);
		expect(documentDbEndpointType).toBeDefined();

		const database = client.db('n8n_vector_e2e');
		const collection = database.collection('documents');
		await collection.insertMany([
			{ text: 'Closest result', embedding: [1, 0, 0], category: 'included' },
			{ text: 'Filtered result', embedding: [0.9, 0.1, 0], category: 'excluded' },
			{ text: 'Distant result', embedding: [0, 1, 0], category: 'included' },
		]);
		await collection.createIndex({ category: 1 });
		await database.command({
			createIndexes: 'documents',
			indexes: [
				{
					name: 'documentdb-vector-index',
					key: { embedding: 'cosmosSearch' },
					cosmosSearchOptions: {
						kind: 'vector-hnsw',
						similarity: 'COS',
						dimensions: 3,
						m: 16,
						efConstruction: 64,
					},
				},
			],
		});

		const store = new ExtendedMongoDBAtlasVectorSearch(
			{} as EmbeddingsInterface,
			{
				collection,
				indexName: 'ignored-atlas-index',
				textKey: 'text',
				embeddingKey: 'embedding',
			},
			client,
			{ category: 'included' },
			undefined,
			documentDbEndpointType,
		);

		const resultLimit = documentDbEndpointType === 'azure' ? 41 : 2;
		const results = await store.similaritySearchVectorWithScore([1, 0, 0], resultLimit);

		expect(results).toHaveLength(2);
		expect(results[0]?.[0].pageContent).toBe('Closest result');
		expect(results.every(([document]) => document.metadata.category === 'included')).toBe(true);
		expect(results[0]?.[1]).toBeGreaterThan(results[1]?.[1] ?? 0);
	});
});
