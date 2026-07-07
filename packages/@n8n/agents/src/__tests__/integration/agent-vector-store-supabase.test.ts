/**
 * End-to-end: a real model searches a real Supabase-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on SUPABASE_TEST_* plus both provider
 * keys; self-skips in CI replay since Supabase can't be replayed from cassettes.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import {
	createSupabaseVectorTableAndFunction,
	dropSupabaseVectorTableAndFunction,
	loadBulkFixture,
	waitUntilQueryable,
} from './vector-store-helpers';
import { Agent, VectorStore } from '../../index';
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
			await dropSupabaseVectorTableAndFunction(adminPool, tableName, queryName);
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
