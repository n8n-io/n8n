import { useRolesStore } from './roles.store';

describe('useRolesStore', () => {
	it('starts not ready and flips once marked', () => {
		const store = useRolesStore();

		expect(store.isReady).toBe(false);

		store.markReady();

		expect(store.isReady).toBe(true);
	});
});
