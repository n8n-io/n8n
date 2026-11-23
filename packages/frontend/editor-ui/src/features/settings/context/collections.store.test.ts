import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useRootStore } from '@n8n/stores/useRootStore';

import { useCollectionsStore } from './collections.store';

const createCollection = vi.fn();
const fetchCollections = vi.fn();

vi.mock('./collections.api', () => ({
	createCollection: async (...args: unknown[]) => await createCollection(...args),
	fetchCollections: async (...args: unknown[]) => await fetchCollections(...args),
}));

function collection(id: string): KnowledgeCollectionDto {
	return {
		id,
		name: `Collection ${id}`,
		description: 'Refunds',
		slug: `collection-${id}`,
		homeProject: { id: 'proj-1', name: 'Support', type: 'team' },
		fileCount: 0,
		totalFileSizeBytes: 0,
		agentCount: 0,
		createdAt: '2026-11-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
	};
}

describe('useCollectionsStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		createCollection.mockReset();
		fetchCollections.mockReset();
	});

	it('keeps the list and the count of a read', async () => {
		const data = [collection('c2'), collection('c1')];
		fetchCollections.mockResolvedValue({ count: 2, data });
		const store = useCollectionsStore();

		await store.fetchCollections();

		expect(fetchCollections).toHaveBeenCalledWith(useRootStore().restApiContext);
		expect(store.collections).toEqual(data);
		expect(store.count).toBe(2);
		expect(store.loading).toBe(false);
	});

	it('marks the list as loading while a read runs', async () => {
		let resolveRead: (value: unknown) => void = () => {};
		fetchCollections.mockReturnValue(
			new Promise((resolve) => {
				resolveRead = resolve;
			}),
		);
		const store = useCollectionsStore();

		const read = store.fetchCollections();
		expect(store.loading).toBe(true);

		resolveRead({ count: 0, data: [] });
		await read;
		expect(store.loading).toBe(false);
	});

	it('keeps the newest read when an earlier one ends last', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		fetchCollections
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveFirst = resolve;
				}),
			)
			.mockResolvedValueOnce({ count: 1, data: [collection('new')] });
		const store = useCollectionsStore();

		const first = store.fetchCollections();
		await store.fetchCollections();
		resolveFirst({ count: 0, data: [] });
		await first;

		expect(store.collections.map((row) => row.id)).toEqual(['new']);
		expect(store.count).toBe(1);
	});

	it('passes a failed read on to the caller and stops loading', async () => {
		const error = new Error('offline');
		fetchCollections.mockRejectedValue(error);
		const store = useCollectionsStore();

		await expect(store.fetchCollections()).rejects.toBe(error);

		expect(store.loading).toBe(false);
	});

	it('creates a collection with the REST context and returns it', async () => {
		const created = { id: 'c1', name: 'Support' } as KnowledgeCollectionDto;
		createCollection.mockResolvedValue(created);
		const store = useCollectionsStore();

		await expect(
			store.createCollection('proj-1', { name: 'Support', description: 'Refunds' }),
		).resolves.toBe(created);

		expect(createCollection).toHaveBeenCalledWith(useRootStore().restApiContext, 'proj-1', {
			name: 'Support',
			description: 'Refunds',
		});
	});

	it('passes a refused create on to the caller', async () => {
		const error = new Error('conflict');
		createCollection.mockRejectedValue(error);
		const store = useCollectionsStore();

		await expect(
			store.createCollection('proj-1', { name: 'Support', description: 'Refunds' }),
		).rejects.toBe(error);
	});
});
