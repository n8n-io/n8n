import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useAiGateway } from './useAiGateway';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

const mockGetGatewayWallet = vi.fn();
const mockGetGatewayConfig = vi
	.fn()
	.mockResolvedValue({ nodes: [], credentialTypes: [], providerConfig: {} });

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayWallet: (...args: unknown[]) => mockGetGatewayWallet(...args),
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

	describe('fetchWallet()', () => {
		it('should not call API when AI Gateway is not enabled', async () => {
			// isEnabled = false (default mock values)
			const { fetchWallet, balance } = useAiGateway();

			await fetchWallet();

			expect(mockGetGatewayWallet).not.toHaveBeenCalled();
			expect(balance.value).toBeUndefined();
		});

		it('should fetch and update balance and budget when enabled', async () => {
			mockIsAiGatewayEnabled.value = true;
			mockGetGatewayWallet.mockResolvedValue({ balance: 7, budget: 10 });

			const { fetchWallet, balance, budget } = useAiGateway();

			await fetchWallet();

			expect(mockGetGatewayWallet).toHaveBeenCalledOnce();
			expect(balance.value).toBe(7);
			expect(budget.value).toBe(10);
		});

		it('should keep previous values on API error', async () => {
			mockIsAiGatewayEnabled.value = true;

			// First successful call
			mockGetGatewayWallet.mockResolvedValueOnce({ balance: 5, budget: 10 });
			const { fetchWallet, balance, budget } = useAiGateway();
			await fetchWallet();
			expect(balance.value).toBe(5);

			// Second call fails
			mockGetGatewayWallet.mockRejectedValueOnce(new Error('Network error'));
			await fetchWallet();

			// Values should remain from first successful call
			expect(balance.value).toBe(5);
			expect(budget.value).toBe(10);
		});

		it('should share balance state across multiple composable instances', async () => {
			mockIsAiGatewayEnabled.value = true;
			mockGetGatewayWallet.mockResolvedValue({ balance: 3, budget: 5 });

			const instance1 = useAiGateway();
			const instance2 = useAiGateway();

			await instance1.fetchWallet();

			// Both instances read from the same store
			expect(instance1.balance.value).toBe(3);
			expect(instance2.balance.value).toBe(3);
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
