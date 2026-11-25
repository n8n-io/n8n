import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useRootStore } from '@n8n/stores/useRootStore';

import { useCollectionsStore } from './collections.store';

const createCollection = vi.fn();
const getCollection = vi.fn();
const listCollectionFiles = vi.fn();
const uploadCollectionFiles = vi.fn();
const deleteCollectionFile = vi.fn();
const listCollectionAgents = vi.fn();
const fetchCollections = vi.fn();
const updateCollection = vi.fn();
const deleteCollection = vi.fn();

vi.mock('./collections.api', () => ({
	createCollection: async (...args: unknown[]) => await createCollection(...args),
	getCollection: async (...args: unknown[]) => await getCollection(...args),
	listCollectionFiles: async (...args: unknown[]) => await listCollectionFiles(...args),
	uploadCollectionFiles: async (...args: unknown[]) => await uploadCollectionFiles(...args),
	deleteCollectionFile: async (...args: unknown[]) => await deleteCollectionFile(...args),
	listCollectionAgents: async (...args: unknown[]) => await listCollectionAgents(...args),
	fetchCollections: async (...args: unknown[]) => await fetchCollections(...args),
	updateCollection: async (...args: unknown[]) => await updateCollection(...args),
	deleteCollection: async (...args: unknown[]) => await deleteCollection(...args),
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
		vi.clearAllMocks();
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

	it('reports no failure of an earlier read once a newer read has started', async () => {
		let rejectFirst: (reason: unknown) => void = () => {};
		fetchCollections
			.mockReturnValueOnce(
				new Promise((_resolve, reject) => {
					rejectFirst = reject;
				}),
			)
			.mockResolvedValueOnce({ count: 1, data: [collection('new')] });
		const store = useCollectionsStore();

		const first = store.fetchCollections();
		await store.fetchCollections();
		rejectFirst(new Error('offline'));

		await expect(first).resolves.toBeUndefined();
		expect(store.collections.map((row) => row.id)).toEqual(['new']);
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

	it('calls the collection page endpoints with the REST context', async () => {
		const store = useCollectionsStore();
		const context = useRootStore().restApiContext;
		const files = [new File(['a'], 'a.txt')];

		await store.getCollection('proj-1', 'c1');
		await store.listCollectionFiles('proj-1', 'c1');
		await store.uploadCollectionFiles('proj-1', 'c1', files);
		await store.deleteCollectionFile('proj-1', 'c1', 'f1');
		await store.listCollectionAgents('proj-1', 'c1');

		expect(getCollection).toHaveBeenCalledWith(context, 'proj-1', 'c1');
		expect(listCollectionFiles).toHaveBeenCalledWith(context, 'proj-1', 'c1');
		expect(uploadCollectionFiles).toHaveBeenCalledWith(context, 'proj-1', 'c1', files);
		expect(deleteCollectionFile).toHaveBeenCalledWith(context, 'proj-1', 'c1', 'f1');
		expect(listCollectionAgents).toHaveBeenCalledWith(context, 'proj-1', 'c1');
	});

	it('updates a collection with the REST context and returns it', async () => {
		const updated = { id: 'c1', name: 'Support handbook' } as KnowledgeCollectionDto;
		updateCollection.mockResolvedValue(updated);
		const store = useCollectionsStore();

		await expect(
			store.updateCollection('proj-1', 'c1', { name: 'Support handbook' }),
		).resolves.toBe(updated);

		expect(updateCollection).toHaveBeenCalledWith(useRootStore().restApiContext, 'proj-1', 'c1', {
			name: 'Support handbook',
		});
	});

	it('passes a refused update on to the caller', async () => {
		const error = new Error('conflict');
		updateCollection.mockRejectedValue(error);
		const store = useCollectionsStore();

		await expect(store.updateCollection('proj-1', 'c1', { name: 'Taken' })).rejects.toBe(error);
	});

	it('deletes a collection with the REST context', async () => {
		deleteCollection.mockResolvedValue({ success: true });
		const store = useCollectionsStore();

		await expect(store.deleteCollection('proj-1', 'c1')).resolves.toBeUndefined();

		expect(deleteCollection).toHaveBeenCalledWith(useRootStore().restApiContext, 'proj-1', 'c1');
	});

	it('passes a failed delete on to the caller', async () => {
		const error = new Error('offline');
		deleteCollection.mockRejectedValue(error);
		const store = useCollectionsStore();

		await expect(store.deleteCollection('proj-1', 'c1')).rejects.toBe(error);
	});
});
