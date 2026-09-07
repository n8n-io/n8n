/**
 * End-to-end: a real model searches a real Supabase-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on SUPABASE_TEST_* plus both provider
 * keys; self-skips in CI replay since Supabase can't be replayed from cassettes.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createSupabaseVectorTableAndFunction,
	dropSupabaseVectorTableAndFunction,
	loadBulkFixture,
	registerAgentVectorStoreTests,
	upsertFixtureDocuments,
	waitUntilQueryable,
} from './vector-store-helpers';
import { VectorStore } from '../../index';
import { SupabaseVectorStore } from '../../vector-stores/supabase';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_TEST_API_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_TEST_DB_URL;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

const HOOK_TIMEOUT_MS = 45_000;

const fixture = loadBulkFixture();

describe.skipIf(!SUPABASE_URL || !SUPABASE_API_KEY || !SUPABASE_DB_URL || !hasKeys)(
	'Agent + SupabaseVectorStore end-to-end',
	() => {
		const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		const tableName = `vs_e2e_${suffix}`;
		const queryName = `match_vs_e2e_${suffix}`;
		let adminPool: Pool;
		let store: SupabaseVectorStore;
		let knowledge: VectorStore;

		beforeAll(async () => {
			const { Pool: PoolCtor } = await import('pg');
			adminPool = new PoolCtor({ connectionString: SUPABASE_DB_URL });
			await createSupabaseVectorTableAndFunction(
				adminPool,
				tableName,
				queryName,
				fixture.dimensions,
			);

			store = new SupabaseVectorStore('knowledge-base', {
				url: SUPABASE_URL!,
				apiKey: SUPABASE_API_KEY!,
				tableName,
				queryName,
			});
			await waitUntilQueryable(store, fixture.dimensions);
			await upsertFixtureDocuments(store, fixture);
			knowledge = new VectorStore('knowledge-base')
				.store(store)
				.embeddingModel('openai/text-embedding-3-small')
				.description('Search the knowledge base of encyclopedia articles');
		}, HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await dropSupabaseVectorTableAndFunction(adminPool, tableName, queryName);
			store.close();
			await adminPool.end();
		});

		registerAgentVectorStoreTests(() => knowledge);
	},
);
