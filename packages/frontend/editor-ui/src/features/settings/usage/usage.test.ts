import { createPinia, setActivePinia } from 'pinia';
import { useUsageStore } from '@/features/settings/usage/usage.store';
import * as usageApi from '@n8n/rest-api-client/api/usage';

vi.mock('@n8n/rest-api-client/api/usage');
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '/', pushRef: '' },
	}),
}));

describe('Usage and plan store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
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
					activeWorkflowTriggers: {
						limit,
						value,
						warningThreshold,
					},
					workflowsHavingEvaluations: {
						value: 0,
						limit: 0,
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

	describe('activateLicense', () => {
		it('should call activateLicenseKey with eulaUri when provided', async () => {
			const store = useUsageStore();
			const mockData = {
				usage: {
					activeWorkflowTriggers: { limit: 10, value: 5, warningThreshold: 0.8 },
					workflowsHavingEvaluations: { value: 0, limit: 0 },
				},
				license: { planId: 'pro', planName: 'Pro' },
			};

			vi.mocked(usageApi.activateLicenseKey).mockResolvedValue(mockData);

			await store.activateLicense('test-key', 'https://example.com/eula');

			expect(usageApi.activateLicenseKey).toHaveBeenCalledWith(expect.anything(), {
				activationKey: 'test-key',
				eulaUri: 'https://example.com/eula',
			});
			expect(store.planName).toBe('Pro');
		});

		it('should call activateLicenseKey without eulaUri when not provided', async () => {
			const store = useUsageStore();
			const mockData = {
				usage: {
					activeWorkflowTriggers: { limit: 10, value: 5, warningThreshold: 0.8 },
					workflowsHavingEvaluations: { value: 0, limit: 0 },
				},
				license: { planId: 'pro', planName: 'Pro' },
			};

			vi.mocked(usageApi.activateLicenseKey).mockResolvedValue(mockData);

			await store.activateLicense('test-key');

			expect(usageApi.activateLicenseKey).toHaveBeenCalledWith(expect.anything(), {
				activationKey: 'test-key',
			});
		});
	});
});
