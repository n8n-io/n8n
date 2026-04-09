import { ref, computed } from 'vue';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayToggle from './AiGatewayToggle.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

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

const renderComponent = createComponentRenderer(AiGatewayToggle);

describe('AiGatewayToggle', () => {
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
		it('should render the toggle switch and label', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(screen.getByTestId('ai-gateway-toggle')).toBeInTheDocument();
			expect(screen.getByTestId('ai-gateway-toggle-switch')).toBeInTheDocument();
			expect(screen.getByText('Connect via n8n Gateway')).toBeInTheDocument();
		});

		it('should not show the callout when disabled', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(
				screen.queryByText('n8n Gateway is the easy way to manage AI model usage'),
			).not.toBeInTheDocument();
		});

		it('should show the callout when enabled', () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(
				screen.getByText('n8n Gateway is the easy way to manage AI model usage'),
			).toBeInTheDocument();
		});

		it('should show credits badge when creditsRemaining is defined', () => {
			mockCreditsRemaining.value = 5;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.getByText('5 credits remaining')).toBeInTheDocument();
		});

		it('should not show credits badge when creditsRemaining is undefined', () => {
			mockCreditsRemaining.value = undefined;
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(screen.queryByText(/credits remaining/)).not.toBeInTheDocument();
		});

		it('should disable the switch in readonly mode', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: true } });

			expect(screen.getByTestId('ai-gateway-toggle-switch')).toBeDisabled();
		});
	});

	describe('toggle emission', () => {
		it('should emit toggle with true when switched on', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: false, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-toggle-switch'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([true]);
		});

		it('should emit toggle with false when switched off', async () => {
			const { emitted } = renderComponent({
				props: { aiGatewayEnabled: true, readonly: false },
			});

			await userEvent.click(screen.getByTestId('ai-gateway-toggle-switch'));

			expect(emitted('toggle')).toBeTruthy();
			expect(emitted('toggle')![0]).toEqual([false]);
		});
	});

	describe('fetchCredits — mount watch (immediate)', () => {
		it('should call fetchCredits immediately when enabled on mount', () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });

			expect(mockFetchCredits).toHaveBeenCalledOnce();
		});

		it('should not call fetchCredits on mount when disabled', () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			expect(mockFetchCredits).not.toHaveBeenCalled();
		});
	});

	describe('fetchCredits — execution finish watch', () => {
		it('should call fetchCredits when execution data has finished:true (saved run)', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchCredits.mockClear();

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await vi.waitFor(() => expect(mockFetchCredits).toHaveBeenCalledOnce());
		});

		it('should call fetchCredits when execution data has stoppedAt set (step/test run)', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchCredits.mockClear();

			workflowsStore.workflowExecutionData = { finished: false, stoppedAt: new Date() } as never;

			await vi.waitFor(() => expect(mockFetchCredits).toHaveBeenCalledOnce());
		});

		it('should not call fetchCredits when execution is still in progress', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchCredits.mockClear();

			workflowsStore.workflowExecutionData = { finished: false, stoppedAt: undefined } as never;

			await new Promise((r) => setTimeout(r, 10));
			expect(mockFetchCredits).not.toHaveBeenCalled();
		});

		it('should call fetchCredits again on consecutive executions', async () => {
			renderComponent({ props: { aiGatewayEnabled: true, readonly: false } });
			mockFetchCredits.mockClear();

			workflowsStore.workflowExecutionData = { finished: true } as never;
			await vi.waitFor(() => expect(mockFetchCredits).toHaveBeenCalledTimes(1));

			workflowsStore.workflowExecutionData = { finished: true } as never;
			await vi.waitFor(() => expect(mockFetchCredits).toHaveBeenCalledTimes(2));
		});

		it('should not call fetchCredits when execution finishes but gateway is disabled', async () => {
			renderComponent({ props: { aiGatewayEnabled: false, readonly: false } });

			workflowsStore.workflowExecutionData = { finished: true } as never;

			await new Promise((r) => setTimeout(r, 10));
			expect(mockFetchCredits).not.toHaveBeenCalled();
		});
	});
});
