import { useApiKeysStore } from './api-keys.store';

describe('useApiKeysStore', () => {
	it('starts not ready and flips once marked', () => {
		const store = useApiKeysStore();

		expect(store.isReady).toBe(false);

		store.markReady();

		expect(store.isReady).toBe(true);
	});
});
