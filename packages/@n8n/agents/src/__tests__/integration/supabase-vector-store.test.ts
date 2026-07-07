/**
 * Integration tests against a real Supabase project. Gated on
 * SUPABASE_TEST_URL / SUPABASE_TEST_API_KEY / SUPABASE_TEST_DB_URL (not the
 * usual API-key/cassette convention) since Supabase is a separate service,
 * not LLM HTTP — these self-skip when any are unset. SUPABASE_TEST_DB_URL is
 * the project's direct Postgres connection string (Dashboard > Connect >
 * Session pooler), used only to provision the table/function via `pg` since
 * supabase-js (PostgREST) cannot run DDL.
 */
import { MockEmbeddingModelV3 } from 'ai/test';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { VectorStore } from '../../sdk/vector-store';
import { SupabaseVectorStore } from '../../vector-stores/supabase';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_TEST_API_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_TEST_DB_URL;

const SCHEMA_WAIT_TIMEOUT_MS = 15_000;
const HOOK_TIMEOUT_MS = 45_000;

/** Stands in for the BYO user's own setup, since SupabaseVectorStore itself never runs DDL. */
async function createVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
	opts: { dimensions: number },
): Promise<void> {
	await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
	await pool.query(
		`CREATE TABLE IF NOT EXISTS "${tableName}" (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			metadata JSONB NOT NULL DEFAULT '{}',
			embedding vector(${opts.dimensions}) NOT NULL
		);`,
	);
	await pool.query(
		`CREATE OR REPLACE FUNCTION "${queryName}"(query_embedding vector(${opts.dimensions}))
		 RETURNS TABLE (id text, content text, metadata jsonb, similarity float)
		 LANGUAGE sql STABLE AS $$
			SELECT id, content, metadata, 1 - (embedding <=> query_embedding) AS similarity
			FROM "${tableName}"
			ORDER BY embedding <=> query_embedding;
		 $$;`,
	);
	// PostgREST caches the schema; new tables/functions aren't servable until it reloads.
	await pool.query("NOTIFY pgrst, 'reload schema';");
}

async function dropVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
): Promise<void> {
	await pool.query(`DROP FUNCTION IF EXISTS "${queryName}"(vector);`);
	await pool.query(`DROP TABLE IF EXISTS "${tableName}";`);
}

/** PostgREST's schema cache reloads asynchronously after DDL — poll until the new function is servable. */
async function waitUntilQueryable(store: SupabaseVectorStore, dimensions: number): Promise<void> {
	const zeroVector: number[] = new Array(dimensions).fill(0);
	const deadline = Date.now() + SCHEMA_WAIT_TIMEOUT_MS;
	for (;;) {
		try {
			await store.query(zeroVector, { topK: 1 });
			return;
		} catch (error) {
			if (Date.now() > deadline) throw error;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
}

describe.skipIf(!SUPABASE_URL || !SUPABASE_API_KEY || !SUPABASE_DB_URL)(
	'SupabaseVectorStore',
	() => {
		const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		const tableName = `vs_test_${suffix}`;
		const queryName = `match_vs_test_${suffix}`;
		let store: SupabaseVectorStore;
		let adminPool: Pool;

		beforeAll(async () => {
			const { Pool: PoolCtor } = await import('pg');
			adminPool = new PoolCtor({ connectionString: SUPABASE_DB_URL });
			await createVectorTableAndFunction(adminPool, tableName, queryName, { dimensions: 3 });
			store = new SupabaseVectorStore('supabase-integration', {
				url: SUPABASE_URL!,
				apiKey: SUPABASE_API_KEY!,
				tableName,
				queryName,
			});
			await waitUntilQueryable(store, 3);
		}, HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await dropVectorTableAndFunction(adminPool, tableName, queryName);
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

		it(
			'round-trips through the VectorStore orchestrator with a mock embedding model',
			async () => {
				const roundTripTable = `${tableName}_roundtrip`;
				const roundTripQueryName = `${queryName}_roundtrip`;
				await createVectorTableAndFunction(adminPool, roundTripTable, roundTripQueryName, {
					dimensions: 3,
				});
				const roundTripStore = new SupabaseVectorStore('supabase-integration-roundtrip', {
					url: SUPABASE_URL!,
					apiKey: SUPABASE_API_KEY!,
					tableName: roundTripTable,
					queryName: roundTripQueryName,
				});
				await waitUntilQueryable(roundTripStore, 3);
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
					await dropVectorTableAndFunction(adminPool, roundTripTable, roundTripQueryName);
					await roundTripStore.close();
				}
			},
			HOOK_TIMEOUT_MS,
		);
	},
);

describe.skipIf(!SUPABASE_URL || !SUPABASE_API_KEY || !SUPABASE_DB_URL)(
	'SupabaseVectorStore — metadata filtering',
	() => {
		const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		const filterTableName = `vs_filter_test_${suffix}`;
		const filterQueryName = `match_vs_filter_test_${suffix}`;
		let filterStore: SupabaseVectorStore;
		let adminPool: Pool;

		beforeAll(async () => {
			const { Pool: PoolCtor } = await import('pg');
			adminPool = new PoolCtor({ connectionString: SUPABASE_DB_URL });
			await createVectorTableAndFunction(adminPool, filterTableName, filterQueryName, {
				dimensions: 3,
			});
			filterStore = new SupabaseVectorStore('supabase-filter-integration', {
				url: SUPABASE_URL!,
				apiKey: SUPABASE_API_KEY!,
				tableName: filterTableName,
				queryName: filterQueryName,
			});
			await waitUntilQueryable(filterStore, 3);
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
		}, HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await dropVectorTableAndFunction(adminPool, filterTableName, filterQueryName);
			await filterStore.close();
			await adminPool.end();
		});

		async function idsFor(filter: Parameters<SupabaseVectorStore['query']>[1]['filter']) {
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
			expect(
				await idsFor({ conditions: [{ key: 'active', operator: 'eq', value: true }] }),
			).toEqual(['a']);
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
			expect(
				await idsFor({ conditions: [{ key: 'count', operator: 'in', value: ['5'] }] }),
			).toEqual(['d']);
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

		it('rejects an empty array for in', async () => {
			await expect(
				filterStore.query([1, 0, 0], {
					topK: 10,
					filter: { conditions: [{ key: 'topic', operator: 'in', value: [] }] },
				}),
			).rejects.toThrow(/requires a non-empty array value/);
		});

		it('rejects an empty array for nin', async () => {
			await expect(
				filterStore.query([1, 0, 0], {
					topK: 10,
					filter: { conditions: [{ key: 'topic', operator: 'nin', value: [] }] },
				}),
			).rejects.toThrow(/requires a non-empty array value/);
		});
	},
);
