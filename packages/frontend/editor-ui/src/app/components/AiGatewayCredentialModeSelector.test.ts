import { ref, computed } from 'vue';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayCredentialModeSelector from './AiGatewayCredentialModeSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const mockFetchCredits = vi.fn().mockResolvedValue(undefined);
const mockCreditsRemaining = ref<number | undefined>(undefined);

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		creditsRemaining: computed(() => mockCreditsRemaining.value),
		fetchCredits: mockFetchCredits,
	})),
}));

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn(() => ({ saveCurrentWorkflow: vi.fn() })),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: vi.fn(() => ({})),
}));

const renderComponent = createComponentRenderer(AiGatewayCredentialModeSelector);

describe('AiGatewayCredentialModeSelector', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCreditsRemaining.value = undefined;
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflowExecutionData = null;
	});

	describe('rendering', () => {
		it('should render both credential mode cards', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(screen.getByTestId('ai-gateway-credential-mode')).toBeInTheDocument();
			expect(screen.getByTestId('ai-gateway-mode-card-n8n')).toBeInTheDocument();
			expect(screen.getByTestId('ai-gateway-mode-card-own')).toBeInTheDocument();
			expect(screen.getByText('n8n Connect')).toBeInTheDocument();
			expect(screen.getByText('My own credential')).toBeInTheDocument();
		});

		it('should not show credits badge when creditsRemaining is undefined', () => {
			mockCreditsRemaining.value = undefined;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.queryByTestId('ai-gateway-credits-badge')).not.toBeInTheDocument();
		});

		it('should show credits badge when gateway is selected and credits are defined', () => {
			mockCreditsRemaining.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.getByTestId('ai-gateway-credits-badge')).toBeInTheDocument();
			expect(screen.getByText('5 credits')).toBeInTheDocument();
		});

		it('should disable both cards in readonly mode', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: true } });

			expect(screen.getByTestId('ai-gateway-mode-card-n8n')).toBeDisabled();
			expect(screen.getByTestId('ai-gateway-mode-card-own')).toBeDisabled();
		});
	});

	describe('toggle emission', () => {
		it('should emit toggle with true when n8n Connect card is selected', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: false, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-mode-card-n8n'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([true]);
		});

		it('should emit toggle with false when My own credential card is selected', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: true, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-mode-card-own'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([false]);
		});
	});

	describe('fetchCredits — mount watch (immediate)', () => {
		it('should call fetchCredits immediately when gateway mode is enabled on mount', () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(mockFetchCredits).toHaveBeenCalledOnce();
		});

		it('should not call fetchCredits on mount when own credential mode', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(mockFetchCredits).not.toHaveBeenCalled();
		});
	});

	describe('fetchCredits — execution finish watch', () => {
		it('should call fetchCredits when execution data has finished:true', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchCredits.mockClear();

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await vi.waitFor(() => expect(mockFetchCredits).toHaveBeenCalledOnce());
		});

		it('should not call fetchCredits when own credential mode even if execution finishes', async () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await new Promise((r) => setTimeout(r, 10));
			expect(mockFetchCredits).not.toHaveBeenCalled();
		});
	});

	describe('top-up badge', () => {
		it('opens top-up modal when credits badge is clicked', async () => {
			mockCreditsRemaining.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			const uiStore = useUIStore();
			vi.spyOn(uiStore, 'openModal');

			await userEvent.click(screen.getByText('5 credits'));

			expect(uiStore.openModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
		});

		it('renders Top up label in the badge', () => {
			mockCreditsRemaining.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.getByText('Top up')).toBeInTheDocument();
		});
	});
});
