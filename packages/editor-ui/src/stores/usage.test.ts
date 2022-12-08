import { createPinia, setActivePinia } from 'pinia';
import { useUsageStore } from '@/stores/usage';


describe('Usage and plan store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test.each([
		[5, 3, .8, false],
		[5, 4, .8, true],
		[5, 4, .9, false],
		[10, 5, .8, false],
		[10, 8, .8, true],
		[10, 9, .8, true],
		[-1, 99, .8, false],
		[-1, 99, .1, false],
	])('should check if workflow usage is close to limit', (limit, value, warningThreshold, expectation) => {
		const store = useUsageStore();
		store.setData({
			usage: {
				executions: {
					limit,
					value,
					warningThreshold,
				},
			},
			license: {
				planId: '',
				planName: '',
			},
		});
		expect(store.isCloseToLimit).toBe(expectation);
	});
});
