/**
 * Shared helpers for the vector-store integration suites (Postgres, Qdrant,
 * Supabase, Pinecone) — fixture loading, locally computed ground truth,
 * Postgres/Supabase DDL setup, Pinecone index provisioning, and shared
 * test-body registration, deduplicated from the per-backend test files.
 */
import type { Index, Pinecone } from '@pinecone-database/pinecone';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import { Agent } from '../../index';
import type { VectorStore } from '../../index';
import type { BaseVectorStore } from '../../storage/base-vector-store';
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
	opts: { dimensions: number; hnswIndex?: boolean; ginIndex?: boolean },
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
	if (opts.hnswIndex) {
		await pool.query(
			`CREATE INDEX IF NOT EXISTS "${tableName}_embedding_idx" ON "${tableName}" USING hnsw (embedding vector_cosine_ops);`,
		);
	}
	if (opts.ginIndex) {
		await pool.query(
			`CREATE INDEX IF NOT EXISTS "${tableName}_metadata_idx" ON "${tableName}" USING gin (metadata jsonb_path_ops);`,
		);
	}
}

/** Stands in for the BYO user's own setup, since SupabaseVectorStore itself never runs DDL. */
export async function createSupabaseVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
	dimensions: number,
): Promise<void> {
	await createPgVectorTable(pool, tableName, { dimensions });
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

/** Stands in for the BYO user's own setup, since PineconeVectorStore itself never creates indexes. */
export async function createPineconeIndex(
	pc: Pinecone,
	name: string,
	dimensions: number,
): Promise<void> {
	await pc.createIndex({
		name,
		dimension: dimensions,
		metric: 'cosine',
		spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
		waitUntilReady: true,
	});
}

/** Pinecone writes are eventually consistent — poll index stats until the expected record count is visible. */
export async function waitForPineconeRecordCount(index: Index, expected: number): Promise<void> {
	const deadline = Date.now() + SCHEMA_WAIT_TIMEOUT_MS * 4;
	for (;;) {
		const stats = await index.describeIndexStats();
		if (stats.totalRecordCount === expected) return;
		if (Date.now() > deadline) {
			throw new Error(
				`Timed out waiting for Pinecone record count to reach ${expected} (last seen: ${stats.totalRecordCount ?? 0}).`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

export async function upsertFixtureDocuments(
	store: BaseVectorStore,
	fixture: BulkFixture,
): Promise<void> {
	await store.upsert(
		fixture.documents.map((doc) => ({
			id: doc.id,
			vector: doc.vector,
			content: doc.content,
			metadata: doc.metadata,
		})),
	);
}

/**
 * Registers the bulk retrieval-quality `it` blocks shared by all four
 * backends' `vector-store-bulk-*.test.ts` suites. Must be called inside the
 * suite's `describe` body, after `getStore` is guaranteed to resolve (i.e.
 * after `beforeAll` populates the store). Order matters: the delete test
 * mutates the corpus and must run last.
 */
export function registerBulkVectorStoreTests(
	fixture: BulkFixture,
	getStore: () => BaseVectorStore,
	opts?: { afterDelete?: (remainingCount: number) => Promise<void> },
): void {
	it('returns the expected best match for each known-answer query', async () => {
		const store = getStore();
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
		const store = getStore();
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
		const store = getStore();
		const geographyDocs = fixture.documents.filter((doc) => doc.metadata.category === 'geography');
		const expectedIds = localTopIds(geographyDocs, fixture.queries[0].vector, 10);

		const results = await store.query(fixture.queries[0].vector, {
			topK: 10,
			filter: { conditions: [{ key: 'category', operator: 'nin', value: ['history', 'science'] }] },
		});

		expect(results.map((r) => r.id)).toEqual(expectedIds);
		for (const result of results) expect(result.metadata.category).toBe('geography');
	});

	it('deletes a batch and stops returning the deleted documents', async () => {
		const store = getStore();
		const idsToDelete = localTopIds(fixture.documents, fixture.queries[1].vector, 20);
		expect(idsToDelete).toContain(fixture.queries[1].expectedTopId);

		await store.delete({ ids: idsToDelete });
		await opts?.afterDelete?.(fixture.documents.length - idsToDelete.length);

		const remaining = fixture.documents.filter((doc) => !idsToDelete.includes(doc.id));
		const expectedTopIds = localTopIds(remaining, fixture.queries[1].vector, 5);

		const results = await store.query(fixture.queries[1].vector, { topK: 5 });
		const resultIds = results.map((r) => r.id);

		expect(resultIds).toEqual(expectedTopIds);
		for (const deletedId of idsToDelete) expect(resultIds).not.toContain(deletedId);
	});
}

/**
 * Registers the agent end-to-end `it` blocks shared by all four backends'
 * `agent-vector-store-*.test.ts` suites. Must be called inside the suite's
 * `describe` body, after `getKnowledge` is guaranteed to resolve.
 */
export function registerAgentVectorStoreTests(getKnowledge: () => VectorStore): void {
	it('answers a question using knowledge retrieved from the backend', async () => {
		const agent = new Agent('kb-assistant')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You answer questions from the knowledge base. Always search it before answering. Be concise.',
			)
			.vectorStore(getKnowledge());

		const result = await agent.generate(
			'What is the tallest federal building in Manhattan, and how many stories does it have?',
		);

		const searchCalls = (result.toolCalls ?? []).filter(
			(tc) => tc.tool === 'search_knowledge_base',
		);
		expect(searchCalls.length).toBeGreaterThanOrEqual(1);

		const searchOutput = searchCalls[0].output as {
			results: Array<{ content: string; score: number; metadata: { title?: string } }>;
		};
		expect(searchOutput.results.length).toBeGreaterThanOrEqual(1);
		expect(searchOutput.results[0].metadata.title).toBe('Jacob K. Javits Federal Building');

		const answer = findLastTextContent(result.messages);
		expect(answer).toMatch(/41/);
	});

	it('narrows results with a model-controlled metadata filter', async () => {
		const agent = new Agent('kb-assistant-filtered')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You answer questions from the knowledge base. Always search it before answering. ' +
					'Always pass a filter on the category key when the user names a specific category.',
			)
			.vectorStore(getKnowledge(), {
				filterableKeys: {
					category: "Document category, exactly one of: 'history', 'science', 'geography'",
				},
			});

		const result = await agent.generate(
			'Search only the geography category: what places are described?',
		);

		const searchCalls = (result.toolCalls ?? []).filter(
			(tc) => tc.tool === 'search_knowledge_base',
		);
		expect(searchCalls.length).toBeGreaterThanOrEqual(1);

		const input = searchCalls[0].input as {
			filter?: Array<{ key: string; operator: string; value: unknown }>;
		};
		const categoryCondition = input.filter?.find((c) => c.key === 'category');
		expect(categoryCondition).toBeDefined();
		if (categoryCondition?.operator === 'in') {
			expect(categoryCondition.value).toContain('geography');
		} else {
			expect(categoryCondition?.value).toBe('geography');
		}

		const searchOutput = searchCalls[0].output as {
			results: Array<{ metadata: { category?: string } }>;
		};
		for (const searchResult of searchOutput.results) {
			expect(searchResult.metadata.category).toBe('geography');
		}

		const answer = findLastTextContent(result.messages);
		expect(answer).toBeTruthy();
	});
}
