/**
 * Bulk retrieval-quality suite run against PgVectorStore using a committed
 * 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createPgVectorTable,
	loadBulkFixture,
	registerBulkVectorStoreTests,
	upsertFixtureDocuments,
} from './vector-store-helpers';
import { PgVectorStore } from '../../vector-stores/postgres';

const PG_URL = process.env.PG_VECTOR_TEST_URL;

const HOOK_TIMEOUT_MS = 60_000;

const fixture = loadBulkFixture();

describe.skipIf(!PG_URL)('PgVectorStore — bulk fixture corpus', () => {
	const tableName = `vs_bulk_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let pool: Pool;
	let store: PgVectorStore;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		pool = new PoolCtor({ connectionString: PG_URL });
		await createPgVectorTable(pool, tableName, { dimensions: fixture.dimensions });
		store = new PgVectorStore('bulk-pg', { connectionString: PG_URL!, tableName });
		await upsertFixtureDocuments(store, fixture);
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await pool.query(`DROP TABLE IF EXISTS "${tableName}";`);
		await store.close();
		await pool.end();
	});

	registerBulkVectorStoreTests(fixture, () => store);
});
