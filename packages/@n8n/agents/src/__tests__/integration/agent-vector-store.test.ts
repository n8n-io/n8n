/**
 * End-to-end: a real model searches a real Postgres-backed VectorStore and
 * answers from the results. Gated on PG_VECTOR_TEST_URL plus both provider
 * keys; self-skips in CI replay since Postgres can't be replayed from cassettes.
 */
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import { Agent, VectorStore } from '../../index';
import { PgVectorStore } from '../../vector-stores/postgres';

const PG_URL = process.env.PG_VECTOR_TEST_URL;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

/** Stands in for the BYO user's own setup; dimensions match `openai/text-embedding-3-small`. */
async function createVectorTable(pool: Pool, tableName: string): Promise<void> {
	await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
	await pool.query(
		`CREATE TABLE IF NOT EXISTS "${tableName}" (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			metadata JSONB NOT NULL DEFAULT '{}',
			embedding vector(1536) NOT NULL
		);`,
	);
}

describe.skipIf(!PG_URL || !hasKeys)('Agent + PgVectorStore end-to-end', () => {
	const tableName = `vs_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminPool: Pool;
	let store: PgVectorStore;
	let knowledge: VectorStore;

	beforeAll(async () => {
		const { Pool: PoolCtor } = await import('pg');
		adminPool = new PoolCtor({ connectionString: PG_URL });
		await createVectorTable(adminPool, tableName);

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

	it('narrows results with a model-controlled metadata filter', async () => {
		const filterTableName = `${tableName}_filter`;
		await createVectorTable(adminPool, filterTableName);
		const filterStore = new PgVectorStore('product-line-docs', {
			connectionString: PG_URL!,
			tableName: filterTableName,
		});

		try {
			// Near-identical docs differing only in metadata — only a correct filter makes the answer deterministic.
			const productDocs = new VectorStore('product-line-docs')
				.store(filterStore)
				.embeddingModel('openai/text-embedding-3-small')
				.description('Search product-line-specific documentation')
				.topK(1);
			await productDocs.addDocuments([
				{ content: 'The battery lasts 17 hours.', metadata: { product: 'x9' } },
				{ content: 'The battery lasts 23 hours.', metadata: { product: 'x5' } },
			]);

			const agent = new Agent('kb-assistant-filtered')
				.model('anthropic/claude-haiku-4-5')
				.instructions(
					'You answer questions about Zephyr products. Always search the product documentation. ' +
						'Always pass a filter on the product key when the user names a specific product.',
				)
				.vectorStore(productDocs, {
					filterableKeys: { product: "Product line, exactly one of: 'x9', 'x5'" },
				});

			const result = await agent.generate('How many hours of battery life does the X5 have?');

			const searchCalls = (result.toolCalls ?? []).filter(
				(tc) => tc.tool === 'search_product_line_docs',
			);
			expect(searchCalls.length).toBeGreaterThanOrEqual(1);

			const input = searchCalls[0].input as {
				filter?: Array<{ key: string; operator: string; value: unknown }>;
			};
			const productCondition = input.filter?.find((c) => c.key === 'product');
			expect(productCondition).toBeDefined();
			if (productCondition?.operator === 'in') {
				expect(productCondition.value).toContain('x5');
			} else {
				expect(productCondition?.value).toBe('x5');
			}

			const answer = findLastTextContent(result.messages);
			expect(answer).toMatch(/23/);
		} finally {
			await adminPool.query(`DROP TABLE IF EXISTS "${filterTableName}";`);
			await filterStore.close();
		}
	});
});
