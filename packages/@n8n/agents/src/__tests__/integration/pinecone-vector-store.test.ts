/**
 * Integration tests against a real Pinecone project. Gated on
 * PINECONE_TEST_API_KEY (not the usual API-key/cassette convention) since
 * Pinecone is a separate service, not LLM HTTP — these self-skip when it's
 * unset. Pinecone writes and deletes are eventually consistent, so every
 * assertion that depends on a preceding mutation is wrapped in `eventually`,
 * which retries the assertion until it passes or a timeout elapses.
 */
import type { Pinecone } from '@pinecone-database/pinecone';
import { MockEmbeddingModelV3 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPineconeIndex } from './vector-store-helpers';
import { VectorStore } from '../../sdk/vector-store';
import { PineconeVectorStore } from '../../vector-stores/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_TEST_API_KEY;

const HOOK_TIMEOUT_MS = 180_000;

async function eventually(fn: () => void | Promise<void>, timeoutMs = 15_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		try {
			await fn();
			return;
		} catch (error) {
			if (Date.now() > deadline) throw error;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
}

describe.skipIf(!PINECONE_API_KEY)('PineconeVectorStore', () => {
	const indexName = `vs-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	let store: PineconeVectorStore;
	let adminClient: Pinecone;

	beforeAll(async () => {
		const { Pinecone: PineconeCtor } = await import('@pinecone-database/pinecone');
		adminClient = new PineconeCtor({ apiKey: PINECONE_API_KEY! });
		await createPineconeIndex(adminClient, indexName, 3);
		store = new PineconeVectorStore('pinecone-integration', {
			apiKey: PINECONE_API_KEY!,
			indexName,
		});
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteIndex(indexName);
		store.close();
	});

	it('upserts vectors with metadata and queries by similarity', async () => {
		await store.upsert([
			{ id: 'exact', vector: [1, 0, 0], content: 'exact match', metadata: { topic: 'a' } },
			{ id: 'near', vector: [0.9, 0.1, 0], content: 'near match', metadata: {} },
			{ id: 'far', vector: [0, 1, 0], content: 'far match', metadata: {} },
		]);

		await eventually(async () => {
			const results = await store.query([1, 0, 0], { topK: 2 });
			expect(results).toHaveLength(2);
			expect(results[0].id).toBe('exact');
			expect(results[0].score).toBeCloseTo(1, 3);
			expect(results[0].metadata).toEqual({ topic: 'a' });
			expect(results[1].id).toBe('near');
		});
	});

	it('re-upserting the same id updates its content', async () => {
		await store.upsert([
			{ id: 'exact', vector: [1, 0, 0], content: 'updated content', metadata: {} },
		]);

		await eventually(async () => {
			const results = await store.query([1, 0, 0], { topK: 1 });
			expect(results[0].id).toBe('exact');
			expect(results[0].content).toBe('updated content');
		});
	});

	it('deletes by ids', async () => {
		await store.delete({ ids: ['far'] });

		await eventually(async () => {
			const results = await store.query([0, 1, 0], { topK: 5 });
			expect(results.find((r) => r.id === 'far')).toBeUndefined();
		});
	});

	it('rejects upserting metadata that uses the reserved _content key', async () => {
		await expect(
			store.upsert([{ id: 'bad', vector: [1, 0, 0], content: 'x', metadata: { _content: 'y' } }]),
		).rejects.toThrow(/reserved for the document content/);
	});

	it('rejects upserting a nested-object metadata value', async () => {
		await expect(
			store.upsert([
				{ id: 'bad', vector: [1, 0, 0], content: 'x', metadata: { nested: { a: 1 } } },
			]),
		).rejects.toThrow(/unsupported/);
	});

	it('round-trips through the VectorStore orchestrator with a mock embedding model', async () => {
		const roundTripStore = new PineconeVectorStore('pinecone-integration-roundtrip', {
			apiKey: PINECONE_API_KEY!,
			indexName,
			namespace: 'roundtrip',
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

			await eventually(async () => {
				const results = await knowledge.search('how long do refunds take');
				expect(results[0].content).toBe('refunds take 5 days');
			});
		} finally {
			roundTripStore.close();
		}
	});
});

describe.skipIf(!PINECONE_API_KEY)('PineconeVectorStore — metadata filtering', () => {
	const indexName = `vs-test-filter-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	let filterStore: PineconeVectorStore;
	let adminClient: Pinecone;

	beforeAll(async () => {
		const { Pinecone: PineconeCtor } = await import('@pinecone-database/pinecone');
		adminClient = new PineconeCtor({ apiKey: PINECONE_API_KEY! });
		await createPineconeIndex(adminClient, indexName, 3);
		filterStore = new PineconeVectorStore('pinecone-filter-integration', {
			apiKey: PINECONE_API_KEY!,
			indexName,
		});
		await filterStore.upsert([
			{
				id: 'a',
				content: 'Row A content',
				vector: [1, 0, 0],
				metadata: { topic: 'billing', count: 5, active: true },
			},
			{
				id: 'b',
				content: 'Row B content',
				vector: [0.9, 0.1, 0],
				metadata: { topic: 'ops', count: 10, active: false },
			},
			// Missing all keys — required to prove ne/nin match rows that never had the key.
			{ id: 'c', content: 'Row C content', vector: [0, 1, 0], metadata: {} },
			// Stores count as a JSON string, not a number — proves a numeric filter
			// doesn't match it, and (unlike Qdrant, which restricts a field to one
			// index type) that a string filter on the same field matches it back.
			{ id: 'd', content: 'Row D content', vector: [0, 0.5, 0.5], metadata: { count: '5' } },
		]);
		// Pinecone writes are eventually consistent — wait for the full corpus to be queryable before any test runs.
		await eventually(async () => {
			const results = await filterStore.query([1, 0, 0], { topK: 10 });
			expect(results.map((r) => r.id).sort()).toEqual(['a', 'b', 'c', 'd']);
		}, 30_000);
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteIndex(indexName);
		filterStore.close();
	});

	async function idsFor(filter: Parameters<PineconeVectorStore['query']>[1]['filter']) {
		const results = await filterStore.query([1, 0, 0], { topK: 10, filter });
		return results.map((r) => r.id).sort();
	}

	it('eq matches on string, number, and boolean, and is type-correct', async () => {
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'eq', value: 'billing' }] }),
		).toEqual(['a']);
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'eq', value: 5 }] })).toEqual([
			'a',
		]);
		expect(await idsFor({ conditions: [{ key: 'active', operator: 'eq', value: true }] })).toEqual([
			'a',
		]);
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'eq', value: 'nonexistent' }] }),
		).toEqual([]);
	});

	it('eq is type-correct in both directions between numeric and string-typed values', async () => {
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'eq', value: 5 }] })).toEqual([
			'a',
		]);
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'eq', value: '5' }] })).toEqual([
			'd',
		]);
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
		).toEqual(['a']);
	});

	it('ne excludes only the matching row, including rows missing the key', async () => {
		const ids = await idsFor({
			conditions: [{ key: 'topic', operator: 'ne', value: 'billing' }],
		});
		expect(ids).not.toContain('a');
		expect(ids).toContain('b');
		expect(ids).toContain('c');
	});

	it('in matches only listed values', async () => {
		expect(
			await idsFor({ conditions: [{ key: 'topic', operator: 'in', value: ['billing', 'ops'] }] }),
		).toEqual(['a', 'b']);
	});

	it('in is type-correct: a numeric candidate does not match a string-valued row', async () => {
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'in', value: [5] }] })).toEqual([
			'a',
		]);
	});

	it('nin excludes listed values but matches rows missing the key (the reference NIN bug case)', async () => {
		const ids = await idsFor({
			conditions: [{ key: 'topic', operator: 'nin', value: ['billing'] }],
		});
		expect(ids).not.toContain('a');
		expect(ids).toContain('b');
		expect(ids).toContain('c'); // missing key — must match, not be excluded like `!= ANY` incorrectly does
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
		).toEqual(['a', 'b']);
	});
});
