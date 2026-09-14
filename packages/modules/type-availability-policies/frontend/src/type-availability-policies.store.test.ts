import { useTypeAvailabilityPoliciesStore } from './type-availability-policies.store';

describe('useTypeAvailabilityPoliciesStore', () => {
	it('starts not ready and flips once marked', () => {
		const store = useTypeAvailabilityPoliciesStore();

		expect(store.isReady).toBe(false);

		store.markReady();

		expect(store.isReady).toBe(true);
	});
});
