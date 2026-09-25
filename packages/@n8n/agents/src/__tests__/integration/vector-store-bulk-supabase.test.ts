/**
 * Bulk retrieval-quality suite run against SupabaseVectorStore using a
 * committed 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createSupabaseVectorTableAndFunction,
	dropSupabaseVectorTableAndFunction,
	loadBulkFixture,
	registerBulkVectorStoreTests,
	upsertFixtureDocuments,
	waitUntilQueryable,
} from './vector-store-helpers';
import { SupabaseVectorStore } from '../../vector-stores/supabase';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_TEST_API_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_TEST_DB_URL;

const HOOK_TIMEOUT_MS = 60_000;

const fixture = loadBulkFixture();

describe.skipIf(!SUPABASE_URL || !SUPABASE_API_KEY || !SUPABASE_DB_URL)(
	'SupabaseVectorStore — bulk fixture corpus',
	() => {
		const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		const tableName = `vs_bulk_${suffix}`;
		const queryName = `match_vs_bulk_${suffix}`;
		let pool: Pool;
		let store: SupabaseVectorStore;

		beforeAll(async () => {
			const { Pool: PoolCtor } = await import('pg');
			pool = new PoolCtor({ connectionString: SUPABASE_DB_URL });
			await createSupabaseVectorTableAndFunction(pool, tableName, queryName, fixture.dimensions);
			store = new SupabaseVectorStore('bulk-supabase', {
				url: SUPABASE_URL!,
				apiKey: SUPABASE_API_KEY!,
				tableName,
				queryName,
			});
			await waitUntilQueryable(store, fixture.dimensions);
			await upsertFixtureDocuments(store, fixture);
		}, HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await dropSupabaseVectorTableAndFunction(pool, tableName, queryName);
			store.close();
			await pool.end();
		});

		registerBulkVectorStoreTests(fixture, () => store);
	},
);
