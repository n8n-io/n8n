/**
 * End-to-end: a real model searches a real Qdrant-backed VectorStore
 * populated with the fixture corpus (see fixtures/generate-bulk-vector-fixture.ts)
 * and answers from the results. Gated on QDRANT_TEST_URL plus both provider
 * keys; self-skips in CI replay since Qdrant can't be replayed from cassettes.
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	loadBulkFixture,
	registerAgentVectorStoreTests,
	upsertFixtureDocuments,
} from './vector-store-helpers';
import { VectorStore } from '../../index';
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
		await upsertFixtureDocuments(store, fixture);
		knowledge = new VectorStore('knowledge-base')
			.store(store)
			.embeddingModel('openai/text-embedding-3-small')
			.description('Search the knowledge base of encyclopedia articles');
	});

	afterAll(async () => {
		await adminClient.deleteCollection(collectionName);
		store.close();
	});

	registerAgentVectorStoreTests(() => knowledge);
});
