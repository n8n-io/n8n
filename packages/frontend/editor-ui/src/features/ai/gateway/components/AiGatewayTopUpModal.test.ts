import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import { mockedStore } from '@/__tests__/utils';

vi.mock('@n8n/i18n', async (importActual) => ({
	...(await importActual()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	topUpGatewayCredits: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

// Stub Modal to render slots directly — we test content, not the modal system.
vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		props: ['name', 'title'],
		template:
			'<div :data-modal-name="name" :data-modal-title="title"><slot name="content" /><slot name="footer" /></div>',
	},
}));

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

function renderModal() {
	const pinia = createTestingPinia({ initialState: { aiGateway: { fetchError: null } } });
	setActivePinia(pinia);
	return { ...renderComponent({ pinia }), pinia };
}

describe('AiGatewayTopUpModal.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('preset amounts', () => {
		it('renders all four preset buttons', () => {
			renderModal();

			const presets = screen.getAllByTestId('ai-gateway-topup-preset');
			expect(presets).toHaveLength(4);
			expect(presets.map((b) => b.textContent?.trim())).toEqual(['10', '20', '50', '100']);
		});

		it('selects a preset when clicked', async () => {
			renderModal();

			const [btn10] = screen.getAllByTestId('ai-gateway-topup-preset');
			await userEvent.click(btn10);

			expect(btn10).toHaveClass(/presetBtnSelected/);
		});

		it('deselects a preset when clicked again', async () => {
			renderModal();

			const [btn10] = screen.getAllByTestId('ai-gateway-topup-preset');
			await userEvent.click(btn10);
			await userEvent.click(btn10);

			expect(btn10).not.toHaveClass(/presetBtnSelected/);
		});

		it('switches selection between presets', async () => {
			renderModal();

			const [btn10, btn20] = screen.getAllByTestId('ai-gateway-topup-preset');
			await userEvent.click(btn10);
			await userEvent.click(btn20);

			expect(btn10).not.toHaveClass(/presetBtnSelected/);
			expect(btn20).toHaveClass(/presetBtnSelected/);
		});
	});

	describe('buy button disabled state', () => {
		it('is disabled when no amount is selected', () => {
			renderModal();
			expect(screen.getByTestId('ai-gateway-topup-buy')).toBeDisabled();
		});

		it('is enabled when a preset is selected', async () => {
			renderModal();

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);

			expect(screen.getByTestId('ai-gateway-topup-buy')).not.toBeDisabled();
		});

		it('becomes disabled again when preset is deselected', async () => {
			renderModal();

			const btn = screen.getAllByTestId('ai-gateway-topup-preset')[0];
			await userEvent.click(btn);
			await userEvent.click(btn);

			expect(screen.getByTestId('ai-gateway-topup-buy')).toBeDisabled();
		});
	});

	describe('buy action', () => {
		it('calls topUpCredits with the selected preset amount', async () => {
			renderModal();
			const store = mockedStore(useAiGatewayStore);

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[1]); // 20
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() => expect(store.topUpCredits).toHaveBeenCalledWith(20));
		});

		it('shows thank-you state after successful buy', async () => {
			renderModal();

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() =>
				expect(screen.getByText('Thank you for your interest!')).toBeInTheDocument(),
			);
		});

		it('does not show thank-you state when store sets fetchError', async () => {
			renderModal();
			const store = mockedStore(useAiGatewayStore);
			store.topUpCredits.mockImplementation(async () => {
				store.fetchError = new Error('Payment failed');
			});

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() => expect(store.topUpCredits).toHaveBeenCalled());
			expect(screen.queryByText('Thank you for your interest!')).not.toBeInTheDocument();
		});

		it('shows feedback link in thank-you state', async () => {
			renderModal();

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() =>
				expect(screen.getByTestId('ai-gateway-topup-feedback-link')).toBeInTheDocument(),
			);
		});

		it('hides footer buttons in thank-you state', async () => {
			renderModal();

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() =>
				expect(screen.getByText('Thank you for your interest!')).toBeInTheDocument(),
			);
			// Footer uses visibility:hidden (preserves layout). JSDOM doesn't compute CSS, so we
			// assert the footerHidden class is applied to the footer wrapper instead.
			const buyBtn = screen.getByTestId('ai-gateway-topup-buy');
			expect(buyBtn.closest('div')).toHaveClass(/footerHidden/);
		});

		it('modal title changes to "Coming soon" in thank-you state', async () => {
			const { container } = renderModal();

			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));

			await waitFor(() =>
				expect(
					container.querySelector('[data-modal-title]')?.getAttribute('data-modal-title'),
				).toBe('Coming soon'),
			);
		});
	});

	describe('cancel / close', () => {
		it('calls closeModal when cancel is clicked', async () => {
			renderModal();
			const uiStore = useUIStore();

			await userEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));

			expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
		});

		it('resets to purchase form state after close', async () => {
			renderModal();

			// Navigate to thank-you state
			await userEvent.click(screen.getAllByTestId('ai-gateway-topup-preset')[0]);
			await userEvent.click(screen.getByTestId('ai-gateway-topup-buy'));
			await waitFor(() =>
				expect(screen.getByText('Thank you for your interest!')).toBeInTheDocument(),
			);

			// Cancel button is hidden via visibility:hidden but still in DOM and clickable.
			// Clicking it calls close() which resets all local state.
			await userEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));

			// Purchase form should be visible again
			await waitFor(() =>
				expect(screen.queryByText('Thank you for your interest!')).not.toBeInTheDocument(),
			);
			expect(screen.getAllByTestId('ai-gateway-topup-preset')).toHaveLength(4);
		});
	});
});
