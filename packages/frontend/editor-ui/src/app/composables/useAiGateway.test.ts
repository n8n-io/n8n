import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useAiGateway } from './useAiGateway';

const mockGetGatewayCredits = vi.fn();
const mockIsCredentialTypeSupported = vi.fn().mockReturnValue(false);

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayCredits: (...args: unknown[]) => mockGetGatewayCredits(...args),
}));

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: vi.fn(() => ({
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		isCredentialTypeSupported: (...args: unknown[]) => mockIsCredentialTypeSupported(...args),
	})),
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
const mockGetVariant = vi.fn().mockReturnValue(undefined);

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ isAiGatewayEnabled: mockIsAiGatewayEnabled.value })),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant: mockGetVariant })),
}));

vi.mock('@/app/constants', async () => {
	const actual = await vi.importActual('@/app/constants');
	return {
		...actual,
		AI_GATEWAY_EXPERIMENT: { name: 'ai_gateway', variant: 'enabled' },
	};
});

describe('useAiGateway', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockIsAiGatewayEnabled.value = false;
		mockGetVariant.mockReturnValue(undefined);
		mockIsCredentialTypeSupported.mockReturnValue(false);
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
			mockGetVariant.mockReturnValue('enabled');
			mockIsAiGatewayEnabled.value = true;
			mockGetGatewayCredits.mockResolvedValue({ creditsRemaining: 7, creditsQuota: 10 });

			const { fetchCredits, creditsRemaining, creditsQuota } = useAiGateway();

			await fetchCredits();

			expect(mockGetGatewayCredits).toHaveBeenCalledOnce();
			expect(creditsRemaining.value).toBe(7);
			expect(creditsQuota.value).toBe(10);
		});

		it('should keep previous values on API error', async () => {
			mockGetVariant.mockReturnValue('enabled');
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
	});

	describe('isNodeSupported()', () => {
		it('should return true when store reports credential type as supported', () => {
			mockIsCredentialTypeSupported.mockReturnValue(true);
			const { isNodeSupported } = useAiGateway();
			expect(isNodeSupported('googlePalmApi')).toBe(true);
		});

		it('should return false when store reports credential type as unsupported', () => {
			mockIsCredentialTypeSupported.mockReturnValue(false);
			const { isNodeSupported } = useAiGateway();
			expect(isNodeSupported('openAiApi')).toBe(false);
		});
	});
});
