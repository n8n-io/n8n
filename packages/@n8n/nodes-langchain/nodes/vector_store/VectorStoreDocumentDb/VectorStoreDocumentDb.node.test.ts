import { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { MongoClient } from 'mongodb';
import { mock } from 'vitest-mock-extended';

import { DocumentDbVectorStore } from './VectorStoreDocumentDb.node';

describe('DocumentDbVectorStore', () => {
	const toArray = vi.fn();
	const aggregate = vi.fn(() => ({ toArray }));
	const insertMany = vi.fn();
	const bulkWrite = vi.fn();
	const collection = { aggregate, bulkWrite, insertMany };
	const client = {
		db: vi.fn(() => ({ collection: vi.fn(() => collection) })),
	} as unknown as MongoClient;
	const embeddings = mock<EmbeddingsInterface>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('stores content, embeddings, and metadata in configured fields', async () => {
		const store = new DocumentDbVectorStore(embeddings, {
			client,
			databaseName: 'database',
			collectionName: 'documents',
			embeddingField: 'vector',
			contentField: 'content',
			metadataField: 'metadata',
		});
		const document = new Document({
			pageContent: 'Document text',
			metadata: { category: 'support' },
		});

		await store.addVectors([[0.1, 0.2]], [document]);

		expect(insertMany).toHaveBeenCalledWith([
			{
				content: 'Document text',
				vector: [0.1, 0.2],
				metadata: { category: 'support' },
			},
		]);
	});

	it('queries with the native DocumentDB vector stage and maps scores', async () => {
		toArray.mockResolvedValue([
			{
				content: 'Matched text',
				metadata: { category: 'support' },
				_documentDbVectorScore: 0.91,
			},
		]);
		const store = new DocumentDbVectorStore(embeddings, {
			client,
			databaseName: 'database',
			collectionName: 'documents',
			embeddingField: 'vector',
			contentField: 'content',
			metadataField: 'metadata',
			filter: { 'metadata.namespace': 'team-a' },
			postFilterPipeline: [{ $match: { 'metadata.active': true } }],
		});

		const results = await store.similaritySearchVectorWithScore([0.1, 0.2], 3);

		expect(aggregate).toHaveBeenCalledWith([
			{
				$vectorSearch: {
					queryVector: [0.1, 0.2],
					path: 'vector',
					numCandidates: 30,
					limit: 3,
					filter: { 'metadata.namespace': 'team-a' },
				},
			},
			{ $match: { 'metadata.active': true } },
			{
				$project: {
					_id: 0,
					content: 1,
					metadata: 1,
					_documentDbVectorScore: { $meta: 'vectorSearchScore' },
				},
			},
		]);
		expect(results[0]?.[0].pageContent).toBe('Matched text');
		expect(results[0]?.[0].metadata).toEqual({ category: 'support' });
		expect(results[0]?.[1]).toBe(0.91);
	});

	it('upserts a document when an ID is supplied by update mode', async () => {
		const store = new DocumentDbVectorStore(embeddings, {
			client,
			databaseName: 'database',
			collectionName: 'documents',
			embeddingField: 'vector',
			contentField: 'content',
			metadataField: 'metadata',
		});
		const document = new Document({ pageContent: 'Updated text', metadata: {} });

		await store.addVectors([[0.3, 0.4]], [document], { ids: ['custom-id'] });

		expect(bulkWrite).toHaveBeenCalledWith([
			{
				replaceOne: {
					filter: { _id: 'custom-id' },
					replacement: { content: 'Updated text', vector: [0.3, 0.4], metadata: {} },
					upsert: true,
				},
			},
		]);
	});
});