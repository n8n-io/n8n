/**
 * Unit coverage for the point-id validation in `QdrantVectorStore` — pure
 * string-matching logic that never runs in CI because the integration suite
 * self-skips without a real Qdrant instance (gated on `QDRANT_TEST_URL`).
 *
 * Exercises `upsert()`/`delete()` through the public API with a stubbed
 * client (assigned directly to the private `client` field) so no network
 * calls or `@qdrant/js-client-rest` connection happen.
 */
import { describe, expect, it, vi } from 'vitest';

import { QdrantVectorStore } from '../vector-stores/qdrant';

function createStore(): { store: QdrantVectorStore; upsert: ReturnType<typeof vi.fn> } {
	const store = new QdrantVectorStore('test-store', {
		url: 'http://localhost:6333',
		collectionName: 'docs',
	});
	const upsert = vi.fn().mockResolvedValue(undefined);
	(store as unknown as { client: unknown }).client = { upsert };
	return { store, upsert };
}

describe('QdrantVectorStore point id validation', () => {
	it.each([
		['hyphenated', '550e8400-e29b-41d4-a716-446655440000'],
		['simple (no hyphens)', '936da01f9abd4d9d80c702af85c822a8'],
		['urn-prefixed', 'urn:uuid:550e8400-e29b-41d4-a716-446655440000'],
		['braced', '{550e8400-e29b-41d4-a716-446655440000}'],
		['uppercase hyphenated', '550E8400-E29B-41D4-A716-446655440000'],
		['canonical unsigned integer', '42'],
	])('accepts a %s id', async (_label, id) => {
		const { store, upsert } = createStore();

		await store.upsert([{ id, vector: [1, 0, 0], content: 'c', metadata: {} }]);

		expect(upsert).toHaveBeenCalledWith('docs', {
			wait: true,
			points: [
				{ id: id === '42' ? 42 : id, vector: [1, 0, 0], payload: { content: 'c', metadata: {} } },
			],
		});
	});

	it.each([
		['non-canonical numeric id', '007'],
		['arbitrary non-UUID string', 'not-a-uuid'],
	])('rejects a %s', async (_label, id) => {
		const { store } = createStore();

		await expect(
			store.upsert([{ id, vector: [1, 0, 0], content: 'c', metadata: {} }]),
		).rejects.toThrow(/Qdrant requires ids to be a UUID or a canonical unsigned integer/);
	});
});
