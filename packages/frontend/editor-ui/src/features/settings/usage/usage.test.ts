import { createPinia, setActivePinia } from 'pinia';
import { useUsageStore } from '@/features/settings/usage/usage.store';
import * as usageApi from '@n8n/rest-api-client/api/usage';

vi.mock('@n8n/rest-api-client/api/usage');

// Mock settings store getSettings and getModuleSettings
vi.mock('@/stores/settings.store', async () => {
	const actual = await vi.importActual('@/stores/settings.store');
	return {
		...actual,
		useSettingsStore: () => ({
			getSettings: vi.fn(),
			getModuleSettings: vi.fn(),
		}),
	};
});

describe('Usage and plan store', () => {
	let usageStore: ReturnType<typeof useUsageStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		usageStore = useUsageStore();
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
			usageStore.setData({
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
			expect(usageStore.isCloseToLimit).toBe(expectation);
		},
	);

	describe('activateLicense', () => {
		it('should call activateLicenseKey with eulaUri when provided', async () => {
			const mockData = {
				usage: {
					activeWorkflowTriggers: { limit: 10, value: 5, warningThreshold: 0.8 },
					workflowsHavingEvaluations: { value: 0, limit: 0 },
				},
				license: { planId: 'pro', planName: 'Pro' },
			};

			vi.mocked(usageApi.activateLicenseKey).mockResolvedValue(mockData);

			await usageStore.activateLicense('test-key', 'https://example.com/eula');

			expect(usageApi.activateLicenseKey).toHaveBeenCalledWith(expect.anything(), {
				activationKey: 'test-key',
				eulaUri: 'https://example.com/eula',
			});
			expect(usageStore.planName).toBe('Pro');
		});

		it('should call activateLicenseKey without eulaUri when not provided', async () => {
			const mockData = {
				usage: {
					activeWorkflowTriggers: { limit: 10, value: 5, warningThreshold: 0.8 },
					workflowsHavingEvaluations: { value: 0, limit: 0 },
				},
				license: { planId: 'pro', planName: 'Pro' },
			};

			vi.mocked(usageApi.activateLicenseKey).mockResolvedValue(mockData);

			await usageStore.activateLicense('test-key');

			expect(usageApi.activateLicenseKey).toHaveBeenCalledWith(expect.anything(), {
				activationKey: 'test-key',
			});
		});
	});
});
