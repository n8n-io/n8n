/**
 * Integration tests against a real Postgres + pgvector instance. Gated on
 * PG_VECTOR_TEST_URL (not the usual API-key/cassette convention) since
 * Postgres is raw TCP, not HTTP — these self-skip when the var is unset.
 */
import { MockEmbeddingModelV3 } from 'ai/test';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPgVectorTable } from './vector-store-helpers';
import { VectorStore } from '../../sdk/vector-store';
import { PgVectorStore } from '../../vector-stores/postgres';

const PG_URL = process.env.PG_VECTOR_TEST_URL;

describe.skipIf(!PG_URL)('PgVectorStore', () => {
	const tableName = `vs_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let store: PgVectorStore;
	let adminPool: Pool;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });
		await createPgVectorTable(adminPool, tableName, { dimensions: 3 });
		store = new PgVectorStore('pg-integration', { connectionString: PG_URL!, tableName });
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${tableName}";`);
		await store.close();
		await adminPool.end();
	});

	it('upserts vectors with metadata and queries by similarity', async () => {
		await store.upsert([
			{ id: 'exact', vector: [1, 0, 0], content: 'exact match', metadata: { topic: 'a' } },
			{ id: 'near', vector: [0.9, 0.1, 0], content: 'near match', metadata: {} },
			{ id: 'far', vector: [0, 1, 0], content: 'far match', metadata: {} },
		]);

		const results = await store.query([1, 0, 0], { topK: 2 });

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe('exact');
		expect(results[0].score).toBeCloseTo(1, 6);
		expect(results[0].metadata).toEqual({ topic: 'a' });
		expect(results[1].id).toBe('near');
	});

	it('re-upserting the same id updates its content', async () => {
		await store.upsert([
			{ id: 'exact', vector: [1, 0, 0], content: 'updated content', metadata: {} },
		]);

		const results = await store.query([1, 0, 0], { topK: 1 });

		expect(results[0].id).toBe('exact');
		expect(results[0].content).toBe('updated content');
	});

	it('deletes by ids', async () => {
		await store.delete({ ids: ['far'] });

		const results = await store.query([0, 1, 0], { topK: 5 });

		expect(results.find((r) => r.id === 'far')).toBeUndefined();
	});

	it('round-trips through the VectorStore orchestrator with a mock embedding model', async () => {
		const roundTripTable = `${tableName}_roundtrip`;
		await createPgVectorTable(adminPool, roundTripTable, { dimensions: 3 });
		const roundTripStore = new PgVectorStore('pg-integration-roundtrip', {
			connectionString: PG_URL!,
			tableName: roundTripTable,
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
			await adminPool.query(`DROP TABLE IF EXISTS "${roundTripTable}";`);
			await roundTripStore.close();
		}
	});
});

describe.skipIf(!PG_URL)('PgVectorStore — metadata filtering', () => {
	const filterTableName = `vs_filter_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let filterStore: PgVectorStore;
	let adminPool: Pool;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });
		await createPgVectorTable(adminPool, filterTableName, { dimensions: 3, ginIndex: true });
		filterStore = new PgVectorStore('pg-filter-integration', {
			connectionString: PG_URL!,
			tableName: filterTableName,
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
			// Stores count as a JSON string, not a number — proves eq is type-correct.
			{ id: 'd', content: 'Row D content', vector: [0, 0.5, 0.5], metadata: { count: '5' } },
		]);
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${filterTableName}";`);
		await filterStore.close();
		await adminPool.end();
	});

	async function idsFor(filter: Parameters<PgVectorStore['query']>[1]['filter']) {
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
		const ids = await idsFor({ conditions: [{ key: 'topic', operator: 'ne', value: 'billing' }] });
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
		expect(await idsFor({ conditions: [{ key: 'count', operator: 'in', value: ['5'] }] })).toEqual([
			'd',
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

describe.skipIf(!PG_URL)('PgVectorStore — filtered HNSW under-return (iterative scan)', () => {
	const iterTableName = `vs_iter_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let iterStore: PgVectorStore;
	let adminPool: Pool;
	let targetIds: string[];
	const queryVector = [1, 0, 0];

	function mulberry32(seed: number) {
		return function random() {
			let t = (seed += 0x6d2b79f5);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });
		await createPgVectorTable(adminPool, iterTableName, { dimensions: 3, hnswIndex: true });
		iterStore = new PgVectorStore('pg-iterative-scan', {
			connectionString: PG_URL!,
			tableName: iterTableName,
		});

		const random = mulberry32(42);
		const records: Array<{
			id: string;
			content: string;
			vector: number[];
			metadata: Record<string, string>;
		}> = [];

		// Noise: tightly clustered around the query vector, satisfying HNSW's default candidate search alone.
		for (let i = 0; i < 1995; i++) {
			records.push({
				id: `noise-${i}`,
				content: `noise ${i}`,
				vector: [1 + (random() - 0.5) * 0.01, (random() - 0.5) * 0.01, (random() - 0.5) * 0.01],
				metadata: { group: 'noise' },
			});
		}

		// Target: far from the query, the only rows matching the filter below.
		targetIds = [];
		for (let i = 0; i < 5; i++) {
			const id = `target-${i}`;
			targetIds.push(id);
			records.push({
				id,
				content: `target ${i}`,
				vector: [(random() - 0.5) * 0.01, (random() - 0.5) * 0.01, 1 + (random() - 0.5) * 0.01],
				metadata: { group: 'target' },
			});
		}
		targetIds.sort();

		await iterStore.upsert(records);
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${iterTableName}";`);
		await iterStore.close();
		await adminPool.end();
	});

	it('returns all matching rows through the adapter despite the HNSW under-return bug', async () => {
		const results = await iterStore.query(queryVector, {
			topK: 5,
			filter: { conditions: [{ key: 'group', operator: 'eq', value: 'target' }] },
		});

		expect(results.map((r) => r.id).sort()).toEqual(targetIds);
	});
});
