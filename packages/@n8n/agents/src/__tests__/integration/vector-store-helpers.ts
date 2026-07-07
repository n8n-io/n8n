/**
 * Shared helpers for the vector-store integration suites (Postgres, Qdrant,
 * Supabase) — fixture loading, locally computed ground truth, and Postgres/
 * Supabase DDL setup, deduplicated from the per-backend test files.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';

import type { SupabaseVectorStore } from '../../vector-stores/supabase';

const SCHEMA_WAIT_TIMEOUT_MS = 15_000;

export interface FixtureDocument {
	id: string;
	content: string;
	metadata: { title: string; category: string };
	vector: number[];
}

export interface FixtureQuery {
	text: string;
	vector: number[];
	expectedTopId: string;
}

export interface BulkFixture {
	dimensions: number;
	documents: FixtureDocument[];
	queries: FixtureQuery[];
}

// vitest injects __dirname for TypeScript test files in the node environment.
export function loadBulkFixture(): BulkFixture {
	return JSON.parse(
		readFileSync(path.resolve(__dirname, '../fixtures/bulk-vector-fixture.json'), 'utf-8'),
	) as BulkFixture;
}

export function cosineSimilarity(a: number[], b: number[]): number {
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
export function localTopIds(
	docs: FixtureDocument[],
	queryVector: number[],
	topK: number,
): string[] {
	return [...docs]
		.map((doc) => ({ id: doc.id, score: cosineSimilarity(queryVector, doc.vector) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map((doc) => doc.id);
}

/** Stands in for the BYO user's own setup; dimensions match the embedding model in use. */
export async function createPgVectorTable(
	pool: Pool,
	tableName: string,
	dimensions: number,
): Promise<void> {
	await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
	await pool.query(
		`CREATE TABLE IF NOT EXISTS "${tableName}" (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			metadata JSONB NOT NULL DEFAULT '{}',
			embedding vector(${dimensions}) NOT NULL
		);`,
	);
}

/** Stands in for the BYO user's own setup, since SupabaseVectorStore itself never runs DDL. */
export async function createSupabaseVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
	dimensions: number,
): Promise<void> {
	await createPgVectorTable(pool, tableName, dimensions);
	await pool.query(
		`CREATE OR REPLACE FUNCTION "${queryName}"(query_embedding vector(${dimensions}))
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

export async function dropSupabaseVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
): Promise<void> {
	await pool.query(`DROP FUNCTION IF EXISTS "${queryName}"(vector);`);
	await pool.query(`DROP TABLE IF EXISTS "${tableName}";`);
}

/** PostgREST's schema cache reloads asynchronously after DDL — poll until the new function is servable. */
export async function waitUntilQueryable(
	store: SupabaseVectorStore,
	dimensions: number,
): Promise<void> {
	const zeroVector = new Array<number>(dimensions).fill(0);
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
