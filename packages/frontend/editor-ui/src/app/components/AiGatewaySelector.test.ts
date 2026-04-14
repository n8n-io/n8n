import { ref, computed } from 'vue';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewaySelector from './AiGatewaySelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const mockFetchBalance = vi.fn().mockResolvedValue(undefined);
const mockBalance = ref<number | undefined>(undefined);

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		balance: computed(() => mockBalance.value),
		fetchWallet: mockFetchBalance,
	})),
}));

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn(() => ({ saveCurrentWorkflow: vi.fn() })),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: vi.fn(() => ({})),
}));

const renderComponent = createComponentRenderer(AiGatewaySelector);

describe('AiGatewaySelector', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockBalance.value = undefined;
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflowExecutionData = null;
	});

	describe('rendering', () => {
		it('should render both radio cards', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(screen.getByTestId('ai-gateway-selector')).toBeInTheDocument();
			expect(screen.getByTestId('ai-gateway-selector-connect')).toBeInTheDocument();
			expect(screen.getByTestId('ai-gateway-mode-card-own')).toBeInTheDocument();
			expect(screen.getByText('n8n Connect')).toBeInTheDocument();
			expect(screen.getByText('My own credential')).toBeInTheDocument();
		});

		it('should show balance badge when aiGatewayEnabled and balance is defined', () => {
			mockBalance.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.getByText('$5.00 remaining')).toBeInTheDocument();
		});

		it('should not show balance badge when balance is undefined', () => {
			mockBalance.value = undefined;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.queryByText(/\$[\d.]+/)).not.toBeInTheDocument();
		});

		it('should not show balance badge when aiGatewayEnabled is false', () => {
			mockBalance.value = 5;
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(screen.queryByText(/\$[\d.]+/)).not.toBeInTheDocument();
		});

		it('should disable both cards in readonly mode', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: true } });

			expect(screen.getByTestId('ai-gateway-selector-connect')).toBeDisabled();
			expect(screen.getByTestId('ai-gateway-mode-card-own')).toBeDisabled();
		});
	});

	describe('selection', () => {
		it('should emit select with true when n8n Connect card is clicked while disabled', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: false, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-selector-connect'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([true]);
		});

		it('should emit select with false when own credential card is clicked while gateway is active', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: true, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-mode-card-own'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([false]);
		});

		it('should not emit when n8n Connect card is clicked while already selected', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: true, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-selector-connect'));

			expect(emitted('toggle')).toBeFalsy();
		});

		it('should not emit when own credential card is clicked while already selected', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: false, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-mode-card-own'));

			expect(emitted('toggle')).toBeFalsy();
		});
	});

	describe('fetchWallet — mount watch (immediate)', () => {
		it('should call fetchWallet immediately when enabled on mount', () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(mockFetchBalance).toHaveBeenCalledOnce();
		});

		it('should not call fetchWallet on mount when disabled', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(mockFetchBalance).not.toHaveBeenCalled();
		});
	});

	describe('fetchWallet — execution finish watch', () => {
		it('should call fetchWallet when execution data has finished:true (saved run)', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchBalance.mockClear();

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await vi.waitFor(() => expect(mockFetchBalance).toHaveBeenCalledOnce());
		});

		it('should call fetchWallet when execution data has stoppedAt set (step/test run)', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchBalance.mockClear();

			workflowsStore.workflowExecutionData = { finished: false, stoppedAt: new Date() } as never;

			await vi.waitFor(() => expect(mockFetchBalance).toHaveBeenCalledOnce());
		});

		it('should not call fetchWallet when execution is still in progress', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchBalance.mockClear();

			workflowsStore.workflowExecutionData = { finished: false, stoppedAt: undefined } as never;

			await new Promise((r) => setTimeout(r, 10));
			expect(mockFetchBalance).not.toHaveBeenCalled();
		});

		it('should call fetchWallet again on consecutive executions', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchBalance.mockClear();

			workflowsStore.workflowExecutionData = { finished: true } as never;
			await vi.waitFor(() => expect(mockFetchBalance).toHaveBeenCalledTimes(1));

			workflowsStore.workflowExecutionData = { finished: true } as never;
			await vi.waitFor(() => expect(mockFetchBalance).toHaveBeenCalledTimes(2));
		});

		it('should not call fetchWallet when execution finishes but gateway is disabled', async () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await new Promise((r) => setTimeout(r, 10));
			expect(mockFetchBalance).not.toHaveBeenCalled();
		});
	});

	describe('top-up badge', () => {
		it('opens top-up modal when badge is clicked', async () => {
			mockBalance.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			const uiStore = useUIStore();
			vi.spyOn(uiStore, 'openModalWithData');

			await userEvent.click(screen.getByText('$5.00 remaining'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: AI_GATEWAY_TOP_UP_MODAL_KEY,
				data: { credentialType: undefined },
			});
		});

		it('renders "Top up" label alongside the balance label in the badge', () => {
			mockBalance.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.getByText('Top up')).toBeInTheDocument();
		});
	});
});
