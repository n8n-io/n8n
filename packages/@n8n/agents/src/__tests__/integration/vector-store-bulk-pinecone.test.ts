/**
 * Bulk retrieval-quality suite run against PineconeVectorStore using a
 * committed 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import type { Pinecone } from '@pinecone-database/pinecone';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	createPineconeIndex,
	loadBulkFixture,
	registerBulkVectorStoreTests,
	upsertFixtureDocuments,
	waitForPineconeRecordCount,
} from './vector-store-helpers';
import { PineconeVectorStore } from '../../vector-stores/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_TEST_API_KEY;

const HOOK_TIMEOUT_MS = 240_000;

const fixture = loadBulkFixture();

describe.skipIf(!PINECONE_API_KEY)('PineconeVectorStore — bulk fixture corpus', () => {
	const indexName = `vs-bulk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	let adminClient: Pinecone;
	let store: PineconeVectorStore;

	beforeAll(async () => {
		const { Pinecone: PineconeCtor } = await import('@pinecone-database/pinecone');
		adminClient = new PineconeCtor({ apiKey: PINECONE_API_KEY! });
		await createPineconeIndex(adminClient, indexName, fixture.dimensions);
		store = new PineconeVectorStore('bulk-pinecone', {
			apiKey: PINECONE_API_KEY!,
			indexName,
		});
		await upsertFixtureDocuments(store, fixture);
		await waitForPineconeRecordCount(adminClient.index(indexName), fixture.documents.length);
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteIndex(indexName);
		store.close();
	});

	registerBulkVectorStoreTests(fixture, () => store, {
		afterDelete: async (remainingCount) =>
			await waitForPineconeRecordCount(adminClient.index(indexName), remainingCount),
	});
});
