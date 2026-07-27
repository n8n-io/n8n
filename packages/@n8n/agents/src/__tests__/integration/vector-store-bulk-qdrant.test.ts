/**
 * Bulk retrieval-quality suite run against QdrantVectorStore using a
 * committed 30-document fixture with precomputed embeddings (see
 * fixtures/generate-bulk-vector-fixture.ts). No OpenAI calls at test time —
 * both document and query vectors are precomputed, so "ground truth" is
 * computed locally via cosine similarity and compared against what the
 * backend actually returns.
 */
import type { QdrantClient } from '@qdrant/js-client-rest';
import { afterAll, beforeAll, describe } from 'vitest';

import {
	loadBulkFixture,
	registerBulkVectorStoreTests,
	upsertFixtureDocuments,
} from './vector-store-helpers';
import { QdrantVectorStore } from '../../vector-stores/qdrant';

const QDRANT_URL = process.env.QDRANT_TEST_URL;
const QDRANT_API_KEY = process.env.QDRANT_TEST_API_KEY;

const HOOK_TIMEOUT_MS = 60_000;

const fixture = loadBulkFixture();

describe.skipIf(!QDRANT_URL)('QdrantVectorStore — bulk fixture corpus', () => {
	const collectionName = `vs_bulk_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	let adminClient: QdrantClient;
	let store: QdrantVectorStore;

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
		store = new QdrantVectorStore('bulk-qdrant', {
			url: QDRANT_URL!,
			apiKey: QDRANT_API_KEY,
			collectionName,
		});
		await upsertFixtureDocuments(store, fixture);
	}, HOOK_TIMEOUT_MS);

	afterAll(async () => {
		await adminClient.deleteCollection(collectionName);
		store.close();
	});

	registerBulkVectorStoreTests(fixture, () => store);
});
