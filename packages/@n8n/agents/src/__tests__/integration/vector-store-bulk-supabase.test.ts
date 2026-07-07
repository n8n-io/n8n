/**
 * Bulk retrieval-quality suite run against SupabaseVectorStore using a
 * committed 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SupabaseVectorStore } from '../../vector-stores/supabase';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_TEST_API_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_TEST_DB_URL;

const HOOK_TIMEOUT_MS = 60_000;
const SCHEMA_WAIT_TIMEOUT_MS = 15_000;

interface FixtureDocument {
	id: string;
	content: string;
	metadata: { title: string; category: string };
	vector: number[];
}

interface FixtureQuery {
	text: string;
	vector: number[];
	expectedTopId: string;
}

interface BulkFixture {
	dimensions: number;
	documents: FixtureDocument[];
	queries: FixtureQuery[];
}

// vitest injects __dirname for TypeScript test files in the node environment.
const fixture: BulkFixture = JSON.parse(
	readFileSync(path.resolve(__dirname, '../fixtures/bulk-vector-fixture.json'), 'utf-8'),
);

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let magA = 0;
	let magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Locally computed ground truth — independent of any backend's search semantics. */
function localTopIds(docs: FixtureDocument[], queryVector: number[], topK: number): string[] {
	return [...docs]
		.map((doc) => ({ id: doc.id, score: cosineSimilarity(queryVector, doc.vector) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map((doc) => doc.id);
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
			await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
			await pool.query(
				`CREATE TABLE IF NOT EXISTS "${tableName}" (
					id TEXT PRIMARY KEY,
					content TEXT NOT NULL,
					metadata JSONB NOT NULL DEFAULT '{}',
					embedding vector(${fixture.dimensions}) NOT NULL
				);`,
			);
			await pool.query(
				`CREATE OR REPLACE FUNCTION "${queryName}"(query_embedding vector(${fixture.dimensions}))
				 RETURNS TABLE (id text, content text, metadata jsonb, similarity float)
				 LANGUAGE sql STABLE AS $$
					SELECT id, content, metadata, 1 - (embedding <=> query_embedding) AS similarity
					FROM "${tableName}"
					ORDER BY embedding <=> query_embedding;
				 $$;`,
			);
			await pool.query("NOTIFY pgrst, 'reload schema';");
			store = new SupabaseVectorStore('bulk-supabase', {
				url: SUPABASE_URL!,
				apiKey: SUPABASE_API_KEY!,
				tableName,
				queryName,
			});
			await waitUntilQueryable(store, fixture.dimensions);
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
			await pool.query(`DROP FUNCTION IF EXISTS "${queryName}"(vector);`);
			await pool.query(`DROP TABLE IF EXISTS "${tableName}";`);
			await store.close();
			await pool.end();
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
			const geographyDocs = fixture.documents.filter(
				(doc) => doc.metadata.category === 'geography',
			);
			const expectedIds = localTopIds(geographyDocs, fixture.queries[0].vector, 10);

			const results = await store.query(fixture.queries[0].vector, {
				topK: 10,
				filter: {
					conditions: [{ key: 'category', operator: 'nin', value: ['history', 'science'] }],
				},
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
	},
);
