/**
 * End-to-end: a real model searches a real Qdrant-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on QDRANT_TEST_URL plus both provider
 * keys; self-skips in CI replay since Qdrant can't be replayed from cassettes.
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findLastTextContent } from './helpers';
import { loadBulkFixture } from './vector-store-helpers';
import { Agent, VectorStore } from '../../index';
import { QdrantVectorStore } from '../../vector-stores/qdrant';

const QDRANT_URL = process.env.QDRANT_TEST_URL;
const QDRANT_API_KEY = process.env.QDRANT_TEST_API_KEY;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

const fixture = loadBulkFixture();

describe.skipIf(!QDRANT_URL || !hasKeys)('Agent + QdrantVectorStore end-to-end', () => {
	const collectionName = `vs_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminClient: QdrantClient;
	let store: QdrantVectorStore;
	let knowledge: VectorStore;

	beforeAll(async () => {
		const { QdrantClient: QdrantClientCtor } = await import('@qdrant/js-client-rest');
		adminClient = new QdrantClientCtor({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });
		await adminClient.createCollection(collectionName, {
			vectors: { size: fixture.dimensions, distance: 'Cosine' },
		});
		// Qdrant Cloud requires a payload index to filter on a field at all.
		await adminClient.createPayloadIndex(collectionName, {
			field_name: 'metadata.category',
			field_schema: 'keyword',
		});

		store = new QdrantVectorStore('knowledge-base', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName,
		});
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
	});

	afterAll(async () => {
		await adminClient.deleteCollection(collectionName);
		await store.close();
	});

	it('answers a question using knowledge retrieved from Qdrant', async () => {
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
});
