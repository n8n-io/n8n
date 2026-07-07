/**
 * Bulk retrieval-quality suite run against QdrantVectorStore using a
 * committed 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadBulkFixture, localTopIds } from './vector-store-helpers';
import { QdrantVectorStore } from '../../vector-stores/qdrant';

const QDRANT_URL = process.env.QDRANT_TEST_URL;
const QDRANT_API_KEY = process.env.QDRANT_TEST_API_KEY;

const HOOK_TIMEOUT_MS = 60_000;

const fixture = loadBulkFixture();

describe.skipIf(!QDRANT_URL)('QdrantVectorStore — bulk fixture corpus', () => {
	const collectionName = `vs_bulk_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminClient: QdrantClient;
	let store: QdrantVectorStore;

	beforeAll(async () => {
		const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
		adminClient = new QdrantClientCtor({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
		await adminClient.createCollection(collectionName, {
			vectors: { size: fixture.dimensions, distance: 'Cosine' },
		});
		// Qdrant Cloud requires a payload index to filter on a field at all.
		await adminClient.createPayloadIndex(collectionName, {
			field_name: 'metadata.category',
			field_schema: 'keyword',
		});
		store = new QdrantVectorStore('bulk-qdrant', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName,
		});
		await store.upsert(
			fixture.documents.map((doc) => ({
				id: doc.id,
				vector: doc.vector,
				content: doc.content,
				metadata: doc.metadata,
			})),
		);
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteCollection(collectionName);
		await store.close();
	});

	it('returns the expected best match for each known-answer query', async () => {
		for (const query of fixture.queries) {
			const results = await store.query(query.vector, { topK: 5 });

			expect(results).toHaveLength(5);
			expect(results[0].id).toBe(query.expectedTopId);
			expect(results[0].content.length).toBeGreaterThan(0);
			expect(typeof results[0].metadata.title).toBe('string');
			for (let i = 1; i < results.length; i++) {
				expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
			}
		}
	});

	it('filters by category over the large corpus and matches locally computed ground truth', async () => {
		const scienceDocs = fixture.documents.filter((doc) => doc.metadata.category === 'science');
		const expectedIds = localTopIds(scienceDocs, fixture.queries[0].vector, 10);

		const results = await store.query(fixture.queries[0].vector, {
			topK: 10,
			filter: { conditions: [{ key: 'category', operator: 'eq', value: 'science' }] },
		});

		expect(results.map((r) => r.id)).toEqual(expectedIds);
		for (const result of results) expect(result.metadata.category).toBe('science');
	});

	it('nin filter excludes categories across the corpus', async () => {
		const geographyDocs = fixture.documents.filter((doc) => doc.metadata.category === 'geography');
		const expectedIds = localTopIds(geographyDocs, fixture.queries[0].vector, 10);

		const results = await store.query(fixture.queries[0].vector, {
			topK: 10,
			filter: { conditions: [{ key: 'category', operator: 'nin', value: ['history', 'science'] }] },
		});

		expect(results.map((r) => r.id)).toEqual(expectedIds);
		for (const result of results) expect(result.metadata.category).toBe('geography');
	});

	it('deletes a batch and stops returning the deleted documents', async () => {
		const idsToDelete = localTopIds(fixture.documents, fixture.queries[1].vector, 20);
		expect(idsToDelete).toContain(fixture.queries[1].expectedTopId);

		await store.delete({ ids: idsToDelete });

		const remaining = fixture.documents.filter((doc) => !idsToDelete.includes(doc.id));
		const expectedTopIds = localTopIds(remaining, fixture.queries[1].vector, 5);

		const results = await store.query(fixture.queries[1].vector, { topK: 5 });
		const resultIds = results.map((r) => r.id);

		expect(resultIds).toEqual(expectedTopIds);
		for (const deletedId of idsToDelete) expect(resultIds).not.toContain(deletedId);
	});
});
