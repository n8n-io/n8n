/**
 * End-to-end: a real model searches a real Postgres-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on PG_VECTOR_TEST_URL plus both
 * provider keys; self-skips in CI replay since Postgres can't be replayed
 * from cassettes.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createPgVectorTable,
	loadBulkFixture,
	registerAgentVectorStoreTests,
	upsertFixtureDocuments,
} from './vector-store-helpers';
import { VectorStore } from '../../index';
import { PgVectorStore } from '../../vector-stores/postgres';

const PG_URL = process.env.PG_VECTOR_TEST_URL;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

const fixture = loadBulkFixture();

describe.skipIf(!PG_URL || !hasKeys)('Agent + PgVectorStore end-to-end', () => {
	const tableName = `vs_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminPool: Pool;
	let store: PgVectorStore;
	let knowledge: VectorStore;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });
		await createPgVectorTable(adminPool, tableName, { dimensions: fixture.dimensions });

		store = new PgVectorStore('knowledge-base', { connectionString: PG_URL!, tableName });
		await upsertFixtureDocuments(store, fixture);
		knowledge = new VectorStore('knowledge-base')
			.store(store)
			.embeddingModel('openai/text-embedding-3-small')
			.description('Search the knowledge base of encyclopedia articles');
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${tableName}";`);
		await store.close();
		await adminPool.end();
	});

	registerAgentVectorStoreTests(() => knowledge);
});
