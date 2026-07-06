/**
 * Integration tests for PgVectorStore against a real Postgres + pgvector instance.
 *
 * Gated on PG_VECTOR_TEST_URL rather than the package's usual API-key/cassette
 * convention: Postgres is a raw TCP connection, not HTTP, so nock/cassettes
 * don't apply here. These tests simply skip when the env var is unset
 * (including in CI replay mode, unless the var is explicitly provided).
 */
import { MockEmbeddingModelV3 } from 'ai/test';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
		store = new PgVectorStore('pg-integration', { connectionString: PG_URL!, tableName });
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${tableName}";`);
		await store.close();
		await adminPool.end();
	});

	it('ensureReady is idempotent', async () => {
		await store.ensureReady!({ dimensions: 3 });
		await expect(store.ensureReady!({ dimensions: 3 })).resolves.toBeUndefined();
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

	it('deleting an empty ids array is a no-op', async () => {
		await expect(store.delete({ ids: [] })).resolves.toBeUndefined();
	});

	it('round-trips through the VectorStore orchestrator with a mock embedding model', async () => {
		const roundTripTable = `${tableName}_roundtrip`;
		const roundTripStore = new PgVectorStore('pg-integration-roundtrip', {
			connectionString: PG_URL!,
			tableName: roundTripTable,
		});
		const embeddingModel = new MockEmbeddingModelV3({
			doEmbed: async ({ values }) => ({
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
