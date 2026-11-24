import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useRootStore } from '@n8n/stores/useRootStore';

import { useCollectionsStore } from './collections.store';

const createCollection = vi.fn();

vi.mock('./collections.api', () => ({
	createCollection: async (...args: unknown[]) => await createCollection(...args),
}));

describe('useCollectionsStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		createCollection.mockReset();
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
