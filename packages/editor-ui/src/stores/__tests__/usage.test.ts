import { createPinia, setActivePinia } from 'pinia';
import { useUsageStore } from '@/stores/usage';

describe('Usage and plan store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test.each([
		[5, 3, 0.8, false],
		[5, 4, 0.8, true],
		[5, 4, 0.9, false],
		[10, 5, 0.8, false],
		[10, 8, 0.8, true],
		[10, 9, 0.8, true],
		[-1, 99, 0.8, false],
		[-1, 99, 0.1, false],
	])(
		'should check if workflow usage is close to limit',
		(limit, value, warningThreshold, expectation) => {
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
		},
	);
});
