import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useAiGateway } from './useAiGateway';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

const mockGetGatewayCredits = vi.fn();
const mockGetGatewayConfig = vi
	.fn()
	.mockResolvedValue({ nodes: [], credentialTypes: [], providerConfig: {} });

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayCredits: (...args: unknown[]) => mockGetGatewayCredits(...args),
	getGatewayConfig: (...args: unknown[]) => mockGetGatewayConfig(...args),
}));

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn(() => ({ saveCurrentWorkflow: vi.fn() })),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn(() => ({})),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

const mockIsAiGatewayEnabled = ref(false);

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ isAiGatewayEnabled: mockIsAiGatewayEnabled.value })),
}));

describe('useAiGateway', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockIsAiGatewayEnabled.value = false;
		mockGetGatewayConfig.mockResolvedValue({ nodes: [], credentialTypes: [], providerConfig: {} });
	});

	describe('fetchCredits()', () => {
		it('should not call API when AI Gateway is not enabled', async () => {
			// isEnabled = false (default mock values)
			const { fetchCredits, creditsRemaining } = useAiGateway();

			await fetchCredits();

			expect(mockGetGatewayCredits).not.toHaveBeenCalled();
			expect(creditsRemaining.value).toBeUndefined();
		});

		it('should fetch and update creditsRemaining and creditsQuota when enabled', async () => {
			mockIsAiGatewayEnabled.value = true;
			mockGetGatewayCredits.mockResolvedValue({ creditsRemaining: 7, creditsQuota: 10 });

			const { fetchCredits, creditsRemaining, creditsQuota } = useAiGateway();

			await fetchCredits();

			expect(mockGetGatewayCredits).toHaveBeenCalledOnce();
			expect(creditsRemaining.value).toBe(7);
			expect(creditsQuota.value).toBe(10);
		});

		it('should keep previous values on API error', async () => {
			mockIsAiGatewayEnabled.value = true;

			// First successful call
			mockGetGatewayCredits.mockResolvedValueOnce({ creditsRemaining: 5, creditsQuota: 10 });
			const { fetchCredits, creditsRemaining, creditsQuota } = useAiGateway();
			await fetchCredits();
			expect(creditsRemaining.value).toBe(5);

			// Second call fails
			mockGetGatewayCredits.mockRejectedValueOnce(new Error('Network error'));
			await fetchCredits();

			// Values should remain from first successful call
			expect(creditsRemaining.value).toBe(5);
			expect(creditsQuota.value).toBe(10);
		});

		it('should share credits state across multiple composable instances', async () => {
			mockIsAiGatewayEnabled.value = true;
			mockGetGatewayCredits.mockResolvedValue({ creditsRemaining: 3, creditsQuota: 5 });

			const instance1 = useAiGateway();
			const instance2 = useAiGateway();

			await instance1.fetchCredits();

			// Both instances read from the same store
			expect(instance1.creditsRemaining.value).toBe(3);
			expect(instance2.creditsRemaining.value).toBe(3);
		});
	});

	describe('isCredentialTypeSupported()', () => {
		it('should return true when credential type is in gateway config', async () => {
			mockGetGatewayConfig.mockResolvedValue({
				nodes: [],
				credentialTypes: ['googlePalmApi'],
				providerConfig: {},
			});
			const aiGatewayStore = useAiGatewayStore();
			await aiGatewayStore.fetchConfig();

			const { isCredentialTypeSupported } = useAiGateway();
			expect(isCredentialTypeSupported('googlePalmApi')).toBe(true);
		});

		it('should return false when credential type is not in gateway config', () => {
			const { isCredentialTypeSupported } = useAiGateway();
			expect(isCredentialTypeSupported('openAiApi')).toBe(false);
		});
	});
});
