/**
 * Unit coverage for the metadata-filter translation and metadata-shape
 * validation in `PineconeVectorStore` — logic that never runs in CI because
 * the integration suites self-skip without a real Pinecone project.
 *
 * Exercises `query()`/`upsert()` through the public API with a stubbed
 * `Index` (assigned directly to the private `index` field) so no network
 * calls or `@pinecone-database/pinecone` import happen.
 */
import { describe, expect, it, vi } from 'vitest';

import { PineconeVectorStore } from '../vector-stores/pinecone';

function createStub(queryResult: { matches: unknown[] }) {
	const query = vi.fn().mockResolvedValue(queryResult);
	const upsert = vi.fn().mockResolvedValue(undefined);
	const deleteMany = vi.fn().mockResolvedValue(undefined);
	return { query, upsert, deleteMany };
}

function createStore(): { store: PineconeVectorStore; stub: ReturnType<typeof createStub> } {
	const store = new PineconeVectorStore('test-store', {
		apiKey: 'test-key',
		indexName: 'docs',
	});
	const stub = createStub({ matches: [] });
	(store as unknown as { index: unknown }).index = stub;
	return { store, stub };
}

describe('PineconeVectorStore filter translation', () => {
	it('queries with topK and includeMetadata, with no filter key when absent', async () => {
		const { store, stub } = createStore();

		await store.query([1, 2, 3], { topK: 4 });

		expect(stub.query).toHaveBeenCalledWith({
			vector: [1, 2, 3],
			topK: 4,
			includeMetadata: true,
		});
	});

	it('omits the filter key when the filter has no conditions', async () => {
		const { store, stub } = createStore();

		await store.query([0], { topK: 1, filter: { conditions: [] } });

		expect(stub.query).toHaveBeenCalledWith({ vector: [0], topK: 1, includeMetadata: true });
	});

	it('translates eq to an $eq term wrapped in $and', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'eq', value: 'billing' }] },
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({ filter: { $and: [{ topic: { $eq: 'billing' } }] } }),
		);
	});

	it('translates ne to an $or with an $exists:false arm', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'ne', value: 'billing' }] },
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: {
					$and: [{ $or: [{ topic: { $ne: 'billing' } }, { topic: { $exists: false } }] }],
				},
			}),
		);
	});

	it('translates in to an $in term', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'in', value: ['billing', 'ops'] }] },
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({ filter: { $and: [{ topic: { $in: ['billing', 'ops'] } }] } }),
		);
	});

	it('translates nin to an $or with an $exists:false arm', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: { conditions: [{ key: 'topic', operator: 'nin', value: ['billing', 'ops'] }] },
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: {
					$and: [
						{
							$or: [{ topic: { $nin: ['billing', 'ops'] } }, { topic: { $exists: false } }],
						},
					],
				},
			}),
		);
	});

	it('combines multiple conditions under $and, in condition order', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: {
				conditions: [
					{ key: 'topic', operator: 'eq', value: 'billing' },
					{ key: 'active', operator: 'eq', value: true },
				],
				combineWith: 'and',
			},
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: { $and: [{ topic: { $eq: 'billing' } }, { active: { $eq: true } }] },
			}),
		);
	});

	it('combines multiple conditions under $or', async () => {
		const { store, stub } = createStore();

		await store.query([0], {
			topK: 1,
			filter: {
				conditions: [
					{ key: 'topic', operator: 'eq', value: 'billing' },
					{ key: 'topic', operator: 'eq', value: 'ops' },
				],
				combineWith: 'or',
			},
		});

		expect(stub.query).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: { $or: [{ topic: { $eq: 'billing' } }, { topic: { $eq: 'ops' } }] },
			}),
		);
	});

	it('rejects an empty array for in without calling query', async () => {
		const { store, stub } = createStore();

		await expect(
			store.query([0], {
				topK: 1,
				filter: { conditions: [{ key: 'topic', operator: 'in', value: [] }] },
			}),
		).rejects.toThrow(/requires a non-empty array value/);
		expect(stub.query).not.toHaveBeenCalled();
	});

	it('rejects an empty array for nin without calling query', async () => {
		const { store, stub } = createStore();

		await expect(
			store.query([0], {
				topK: 1,
				filter: { conditions: [{ key: 'topic', operator: 'nin', value: [] }] },
			}),
		).rejects.toThrow(/requires a non-empty array value/);
		expect(stub.query).not.toHaveBeenCalled();
	});

	it('maps matches to query results, stripping _content into content', async () => {
		const { store, stub } = createStore();
		stub.query.mockResolvedValue({
			matches: [{ id: 7, score: 0.5, metadata: { _content: 'hello', topic: 'billing' } }],
		});

		const results = await store.query([0], { topK: 1 });

		expect(results).toEqual([
			{ id: '7', content: 'hello', metadata: { topic: 'billing' }, score: 0.5 },
		]);
	});

	it('defaults content to an empty string and score to 0 when absent', async () => {
		const { store, stub } = createStore();
		stub.query.mockResolvedValue({ matches: [{ id: 'a', metadata: {} }] });

		const results = await store.query([0], { topK: 1 });

		expect(results).toEqual([{ id: 'a', content: '', metadata: {}, score: 0 }]);
	});

	it('upserts records with content stored under the reserved _content key', async () => {
		const { store, stub } = createStore();

		await store.upsert([
			{ id: '1', vector: [1, 0], content: 'hello', metadata: { topic: 'billing' } },
		]);

		expect(stub.upsert).toHaveBeenCalledWith([
			{ id: '1', values: [1, 0], metadata: { _content: 'hello', topic: 'billing' } },
		]);
	});

	it('rejects upserting metadata that uses the reserved _content key', async () => {
		const { store } = createStore();

		await expect(
			store.upsert([{ id: '1', vector: [0], content: 'hi', metadata: { _content: 'x' } }]),
		).rejects.toThrow(/reserved for the document content/);
	});

	it('rejects upserting a nested-object metadata value', async () => {
		const { store } = createStore();

		await expect(
			store.upsert([{ id: '1', vector: [0], content: 'hi', metadata: { nested: { a: 1 } } }]),
		).rejects.toThrow(/unsupported/);
	});

	it('rejects upserting a mixed-type array metadata value', async () => {
		const { store } = createStore();

		await expect(
			store.upsert([{ id: '1', vector: [0], content: 'hi', metadata: { tags: ['a', 1] } }]),
		).rejects.toThrow(/unsupported/);
	});

	it('accepts a string-array metadata value', async () => {
		const { store, stub } = createStore();

		await store.upsert([{ id: '1', vector: [0], content: 'hi', metadata: { tags: ['a', 'b'] } }]);

		expect(stub.upsert).toHaveBeenCalledWith([
			{ id: '1', values: [0], metadata: { _content: 'hi', tags: ['a', 'b'] } },
		]);
	});

	it('splits large upserts into sequential batches of at most 1000 records', async () => {
		const { store, stub } = createStore();
		const records = Array.from({ length: 1001 }, (_, i) => ({
			id: String(i),
			vector: [0],
			content: 'c',
			metadata: {},
		}));

		await store.upsert(records);

		expect(stub.upsert).toHaveBeenCalledTimes(2);
		const calls = stub.upsert.mock.calls as Array<[Array<{ id: string }>]>;
		expect(calls[0][0]).toHaveLength(1000);
		expect(calls[1][0]).toHaveLength(1);
		expect(calls[0][0][0].id).toBe('0');
		expect(calls[1][0][0].id).toBe('1000');
	});

	it('splits upserts into batches that stay under the request byte-size limit', async () => {
		const { store, stub } = createStore();
		// ~400KB of content per record — 5 records exceeds the 1.8MB batch limit before hitting the 1000-record cap.
		const bigContent = 'x'.repeat(400_000);
		const records = Array.from({ length: 5 }, (_, i) => ({
			id: String(i),
			vector: [0],
			content: bigContent,
			metadata: {},
		}));

		await store.upsert(records);

		expect(stub.upsert).toHaveBeenCalledTimes(2);
		const calls = stub.upsert.mock.calls as Array<[Array<{ id: string }>]>;
		expect(calls[0][0]).toHaveLength(4);
		expect(calls[1][0]).toHaveLength(1);
	});

	it('splits large deletes into sequential batches of at most 1000 ids', async () => {
		const { store, stub } = createStore();
		const ids = Array.from({ length: 1001 }, (_, i) => String(i));

		await store.delete({ ids });

		expect(stub.deleteMany).toHaveBeenCalledTimes(2);
		expect(stub.deleteMany).toHaveBeenNthCalledWith(1, ids.slice(0, 1000));
		expect(stub.deleteMany).toHaveBeenNthCalledWith(2, ids.slice(1000));
	});

	it('rejects invalid metadata without sending any batch', async () => {
		const { store, stub } = createStore();
		const records = Array.from({ length: 201 }, (_, i) => ({
			id: String(i),
			vector: [0],
			content: 'c',
			metadata: i === 200 ? { nested: { a: 1 } } : {},
		}));

		await expect(store.upsert(records)).rejects.toThrow(/unsupported/);
		expect(stub.upsert).not.toHaveBeenCalled();
	});
});
