/**
 * End-to-end: a real model searches a real Supabase-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on SUPABASE_TEST_* plus both provider
 * keys; self-skips in CI replay since Supabase can't be replayed from cassettes.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import { Agent, VectorStore } from '../../index';
import { SupabaseVectorStore } from '../../vector-stores/supabase';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_TEST_API_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_TEST_DB_URL;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

const SCHEMA_WAIT_TIMEOUT_MS = 15_000;
const HOOK_TIMEOUT_MS = 45_000;

interface FixtureDocument {
	id: string;
	content: string;
	metadata: { title: string; category: string };
	vector: number[];
}

interface BulkFixture {
	dimensions: number;
	documents: FixtureDocument[];
}

// vitest injects __dirname for TypeScript test files in the node environment.
const fixture: BulkFixture = JSON.parse(
	readFileSync(path.resolve(__dirname, '../fixtures/bulk-vector-fixture.json'), 'utf-8'),
);

/** Stands in for the BYO user's own setup; dimensions match `openai/text-embedding-3-small`. */
async function createVectorTableAndFunction(
	pool: Pool,
	tableName: string,
	queryName: string,
): Promise<void> {
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
			await createVectorTableAndFunction(adminPool, tableName, queryName);

			store = new SupabaseVectorStore('knowledge-base', {
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
			knowledge = new VectorStore('knowledge-base')
				.store(store)
				.embeddingModel('openai/text-embedding-3-small')
				.description('Search the knowledge base of encyclopedia articles');
		}, HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await dropVectorTableAndFunction(adminPool, tableName, queryName);
			await store.close();
			await adminPool.end();
		});

		it('answers a question using knowledge retrieved from Supabase', async () => {
			const agent = new Agent('kb-assistant')
				.model('anthropic/claude-haiku-4-5')
				.instructions(
					'You answer questions from the knowledge base. Always search it before answering. Be concise.',
				)
				.vectorStore(knowledge);

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
				.vectorStore(knowledge, {
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
	},
);
