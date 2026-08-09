/**
 * Integration tests against a real Qdrant instance — local or cloud. Gated on
 * QDRANT_TEST_URL (not the usual API-key/cassette convention) since Qdrant is
 * a separate service, not LLM HTTP — these self-skip when it's unset.
 * QDRANT_TEST_API_KEY is optional, for cloud instances that require auth.
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
import { MockEmbeddingModelV3 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { VectorStore } from '../../sdk/vector-store';
import { QdrantVectorStore } from '../../vector-stores/qdrant';

const QDRANT_URL = process.env.QDRANT_TEST_URL;
const QDRANT_API_KEY = process.env.QDRANT_TEST_API_KEY;

// Qdrant only accepts UUID or unsigned-integer point ids.
const ID_EXACT = '00000000-0000-4000-8000-000000000001';
const ID_NEAR = '00000000-0000-4000-8000-000000000002';
const ID_FAR = '00000000-0000-4000-8000-000000000003';

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';
const ID_C = '00000000-0000-4000-8000-00000000000c';
const ID_D = '00000000-0000-4000-8000-00000000000d';

/** Stands in for the BYO user's own setup, since QdrantVectorStore itself never creates collections. */
async function createVectorCollection(
	client: QdrantClient,
	collectionName: string,
	opts: { dimensions: number },
): Promise<void> {
	await client.createCollection(collectionName, {
		vectors: { size: opts.dimensions, distance: 'Cosine' },
	});
}

describe.skipIf(!QDRANT_URL)('QdrantVectorStore', () => {
	const collectionName = `vs_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let store: QdrantVectorStore;
	let adminClient: QdrantClient;

	beforeAll(async () => {
		const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
		adminClient = new QdrantClientCtor({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
		await createVectorCollection(adminClient, collectionName, { dimensions: 3 });
		store = new QdrantVectorStore('qdrant-integration', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName,
		});
	});

	afterAll(async () => {
		await adminClient.deleteCollection(collectionName);
		store.close();
	});

	it('upserts vectors with metadata and queries by similarity', async () => {
		await store.upsert([
			{ id: ID_EXACT, vector: [1, 0, 0], content: 'exact match', metadata: { topic: 'a' } },
			{ id: ID_NEAR, vector: [0.9, 0.1, 0], content: 'near match', metadata: {} },
			{ id: ID_FAR, vector: [0, 1, 0], content: 'far match', metadata: {} },
		]);

		const results = await store.query([1, 0, 0], { topK: 2 });

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe(ID_EXACT);
		expect(results[0].score).toBeCloseTo(1, 6);
		expect(results[0].metadata).toEqual({ topic: 'a' });
		expect(results[1].id).toBe(ID_NEAR);
	});

	it('re-upserting the same id updates its content', async () => {
		await store.upsert([
			{ id: ID_EXACT, vector: [1, 0, 0], content: 'updated content', metadata: {} },
		]);

		const results = await store.query([1, 0, 0], { topK: 1 });

		expect(results[0].id).toBe(ID_EXACT);
		expect(results[0].content).toBe('updated content');
	});

	it('deletes by ids', async () => {
		await store.delete({ ids: [ID_FAR] });

		const results = await store.query([0, 1, 0], { topK: 5 });

		expect(results.find((r) => r.id === ID_FAR)).toBeUndefined();
	});

	it('rejects a non-UUID, non-integer id', async () => {
		await expect(
			store.upsert([{ id: 'exact', vector: [1, 0, 0], content: 'bad id', metadata: {} }]),
		).rejects.toThrow(/Qdrant requires ids to be a UUID or a canonical unsigned integer/);
	});

	it('rejects a non-canonical numeric id', async () => {
		await expect(
			store.upsert([{ id: '007', vector: [1, 0, 0], content: 'bad id', metadata: {} }]),
		).rejects.toThrow(/canonical unsigned integer/);
	});

	it('round-trips through the VectorStore orchestrator with a mock embedding model', async () => {
		const roundTripCollection = `${collectionName}_roundtrip`;
		await createVectorCollection(adminClient, roundTripCollection, { dimensions: 3 });
		const roundTripStore = new QdrantVectorStore('qdrant-integration-roundtrip', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName: roundTripCollection,
		});
		const embeddingModel = new MockEmbeddingModelV3({
			doEmbed: async ({ values }: { values: string[] }) => ({
				embeddings: values.map(() => [1, 0, 0]),
				warnings: [],
			}),
		});

		try {
			const knowledge = new VectorStore('roundtrip')
				.store(roundTripStore)
				.embeddingModel(embeddingModel);
			await knowledge.addDocuments([{ content: 'refunds take 5 days' }]);

			const results = await knowledge.search('how long do refunds take');

			expect(results[0].content).toBe('refunds take 5 days');
		} finally {
			await adminClient.deleteCollection(roundTripCollection);
			roundTripStore.close();
		}
	});
});

describe.skipIf(!QDRANT_URL)('QdrantVectorStore — metadata filtering', () => {
	const filterCollectionName = `vs_test_filter_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let filterStore: QdrantVectorStore;
	let adminClient: QdrantClient;

	beforeAll(async () => {
		const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
		adminClient = new QdrantClientCtor({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
		await createVectorCollection(adminClient, filterCollectionName, { dimensions: 3 });
		// Qdrant Cloud requires a payload index to filter on a field at all, and
		// allows only one index type per field (a second `createPayloadIndex`
		// call on the same field replaces rather than adds) — see the `count`
		// fixture note below for how that constrains what this suite can assert.
		await adminClient.createPayloadIndex(filterCollectionName, {
			field_name: 'metadata.topic',
			field_schema: 'keyword',
		});
		await adminClient.createPayloadIndex(filterCollectionName, {
			field_name: 'metadata.count',
			field_schema: 'integer',
		});
		await adminClient.createPayloadIndex(filterCollectionName, {
			field_name: 'metadata.active',
			field_schema: 'bool',
		});
		filterStore = new QdrantVectorStore('qdrant-filter-integration', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName: filterCollectionName,
		});
		await filterStore.upsert([
			{
				id: ID_A,
				content: 'Row A content',
				vector: [1, 0, 0],
				metadata: { topic: 'billing', count: 5, active: true },
			},
			{
				id: ID_B,
				content: 'Row B content',
				vector: [0.9, 0.1, 0],
				metadata: { topic: 'ops', count: 10, active: false },
			},
			// Missing all keys — required to prove ne/nin match rows that never had the key.
			{ id: ID_C, content: 'Row C content', vector: [0, 1, 0], metadata: {} },
			// Stores count as a JSON string, not a number — proves a numeric filter
			// doesn't match it. (The reverse — a string filter matching this row —
			// isn't tested here: Qdrant's `metadata.count` field is indexed as
			// `integer` above, and a field can only carry one index type at a time,
			// so a `keyword` filter query on the same field isn't servable.)
			{ id: ID_D, content: 'Row D content', vector: [0, 0.5, 0.5], metadata: { count: '5' } },
		]);
	});

	afterAll(async () => {
		await adminClient.deleteCollection(filterCollectionName);
		filterStore.close();
	});

	async function idsFor(filter: Parameters<QdrantVectorStore['query']>[1]['filter']) {
		const results = await filterStore.query([1, 0, 0], { topK: 10, filter });
		return results.map((r) => r.id).sort();
	}

	it('eq matches on string, number, and boolean, and is type-correct', async () => {
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'eq', value: 'billing' }] }),
		).toEqual([ID_A]);
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'eq', value: 5 }] })).toEqual([
			ID_A,
		]);
		expect(await idsFor({ conditions: [{ key: 'active', operator: 'eq', value: true }] })).toEqual([
			ID_A,
		]);
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'eq', value: 'nonexistent' }] }),
		).toEqual([]);
	});

	it('combines multiple conditions with AND', async () => {
		expect(
			await idsFor({
				conditions: [
					{ key: 'topic', operator: 'eq', value: 'billing' },
					{ key: 'count', operator: 'eq', value: 5 },
				],
				combineWith: 'and',
			}),
		).toEqual([ID_A]);
	});

	it('ne excludes only the matching row, including rows missing the key', async () => {
		const ids = await idsFor({
			conditions: [{ key: 'topic', operator: 'ne', value: 'billing' }],
		});
		expect(ids).not.toContain(ID_A);
		expect(ids).toContain(ID_B);
		expect(ids).toContain(ID_C);
	});

	it('in matches only listed values', async () => {
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'in', value: ['billing', 'ops'] }] }),
		).toEqual([ID_A, ID_B].sort());
	});

	it('in is type-correct: a numeric candidate does not match a string-valued row', async () => {
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'in', value: [5] }] })).toEqual([
			ID_A,
		]);
	});

	it('nin excludes listed values but matches rows missing the key (the reference NIN bug case)', async () => {
		const ids = await idsFor({
			conditions: [{ key: 'topic', operator: 'nin', value: ['billing'] }],
		});
		expect(ids).not.toContain(ID_A);
		expect(ids).toContain(ID_B);
		expect(ids).toContain(ID_C); // missing key — must match, not be excluded like `!= ANY` incorrectly does
	});

	it('supports an OR-combined group', async () => {
		expect(
			await idsFor({
				conditions: [
					{ key: 'topic', operator: 'eq', value: 'billing' },
					{ key: 'topic', operator: 'eq', value: 'ops' },
				],
				combineWith: 'or',
			}),
		).toEqual([ID_A, ID_B].sort());
	});

	it('rejects a float value for eq', async () => {
		await expect(
			filterStore.query([1, 0, 0], {
				topK: 10,
				filter: { conditions: [{ key: 'count', operator: 'eq', value: 5.5 }] },
			}),
		).rejects.toThrow(/does not support float values/);
	});

	it('rejects a mixed-type array for in', async () => {
		await expect(
			filterStore.query([1, 0, 0], {
				topK: 10,
				filter: { conditions: [{ key: 'topic', operator: 'in', value: ['billing', 5] }] },
			}),
		).rejects.toThrow(/mixed-type or float values/);
	});
});
