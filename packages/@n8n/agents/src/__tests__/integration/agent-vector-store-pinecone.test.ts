/**
 * End-to-end: a real model searches a real Pinecone-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on PINECONE_TEST_API_KEY plus both
 * provider keys; self-skips in CI replay since Pinecone can't be replayed
 * from cassettes.
 */
import type { Pinecone } from '@pinecone-database/pinecone';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createPineconeIndex,
	loadBulkFixture,
	registerAgentVectorStoreTests,
	upsertFixtureDocuments,
	waitForPineconeRecordCount,
} from './vector-store-helpers';
import { VectorStore } from '../../index';
import { PineconeVectorStore } from '../../vector-stores/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_TEST_API_KEY;
const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(process.env.OPENAI_API_KEY);

const HOOK_TIMEOUT_MS = 240_000;

const fixture = loadBulkFixture();

describe.skipIf(!PINECONE_API_KEY || !hasKeys)('Agent + PineconeVectorStore end-to-end', () => {
	const indexName = `vs-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	let adminClient: Pinecone;
	let store: PineconeVectorStore;
	let knowledge: VectorStore;

	beforeAll(async () => {
		const { Pinecone: PineconeCtor } = await import('@pinecone-database/pinecone');
		adminClient = new PineconeCtor({ apiKey: PINECONE_API_KEY! });
		await createPineconeIndex(adminClient, indexName, fixture.dimensions);

		store = new PineconeVectorStore('knowledge-base', {
			apiKey: PINECONE_API_KEY!,
			indexName,
		});
		await upsertFixtureDocuments(store, fixture);
		await waitForPineconeRecordCount(adminClient.index(indexName), fixture.documents.length);
		knowledge = new VectorStore('knowledge-base')
			.store(store)
			.embeddingModel('openai/text-embedding-3-small')
			.description('Search the knowledge base of encyclopedia articles');
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteIndex(indexName);
		store.close();
	});

	registerAgentVectorStoreTests(() => knowledge);
});
