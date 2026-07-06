/**
 * End-to-end integration test: Agent + VectorStore + PgVectorStore.
 *
 * Exercises the entire flow — a real Anthropic model decides to call the
 * vector search tool, the orchestrator embeds the query with real OpenAI
 * embeddings, PgVectorStore retrieves from a real Postgres + pgvector
 * instance, and the model answers from the retrieved content.
 *
 * Gated on PG_VECTOR_TEST_URL plus both provider keys. Postgres is raw TCP
 * (not HTTP), so this flow cannot be replayed from cassettes — the test
 * self-skips in CI replay mode because PG_VECTOR_TEST_URL is unset there.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import { Agent, VectorStore } from '../../index';
import { PgVectorStore } from '../../vector-stores/postgres';

const PG_URL = process.env.PG_VECTOR_TEST_URL;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!PG_URL || !hasKeys)('Agent + PgVectorStore end-to-end', () => {
	const tableName = `vs_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminPool: Pool;
	let store: PgVectorStore;
	let knowledge: VectorStore;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });

		store = new PgVectorStore('product-docs', { connectionString: PG_URL!, tableName });
		knowledge = new VectorStore('product-docs')
			.store(store)
			.embeddingModel('openai/text-embedding-3-small')
			.description('Search the Zephyr product documentation');

		await knowledge.addDocuments([
			{
				content: 'The Zephyr X9 laptop ships with a 99Wh battery rated for 17 hours of use.',
				metadata: { topic: 'battery' },
			},
			{
				content: 'The Zephyr X9 warranty covers accidental damage for 2 years.',
				metadata: { topic: 'warranty' },
			},
			{
				content: 'Zephyr Cloud subscriptions can be refunded within 14 days of purchase.',
				metadata: { topic: 'billing' },
			},
		]);
	});

	afterAll(async () => {
		await adminPool.query(`DROP TABLE IF EXISTS "${tableName}";`);
		await store.close();
		await adminPool.end();
	});

	it('answers a question using knowledge retrieved from Postgres', async () => {
		const agent = new Agent('kb-assistant')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You answer questions about Zephyr products. Always search the product documentation before answering. Be concise.',
			)
			.vectorStore(knowledge);

		const result = await agent.generate(
			'How many hours of battery life does the Zephyr X9 laptop have?',
		);

		const searchCalls = (result.toolCalls ?? []).filter((tc) => tc.tool === 'search_product_docs');
		expect(searchCalls.length).toBeGreaterThanOrEqual(1);

		const searchOutput = searchCalls[0].output as {
			results: Array<{ content: string; score: number }>;
		};
		expect(searchOutput.results.length).toBeGreaterThanOrEqual(1);
		expect(searchOutput.results[0].content).toContain('17 hours');

		const answer = findLastTextContent(result.messages);
		expect(answer).toMatch(/17/);
	});
});
