import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

async function renderModalOpen() {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	const result = renderComponent({ pinia });
	useUIStore().openModal(AI_GATEWAY_TOP_UP_MODAL_KEY);
	await nextTick();
	await flushPromises();
	return { ...result, pinia };
}

describe('AiGatewayTopUpModal.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders coming soon title and body copy when modal is open', async () => {
		await renderModalOpen();

		await waitFor(() => {
			expect(screen.getByText('Credit top up is coming soon')).toBeInTheDocument();
		});
		expect(
			screen.getByText(/Unfortunately credit top up is still in development/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/In the meantime, you can switch off n8n Connect/i),
		).toBeInTheDocument();
	});

	it('renders feedback link label', async () => {
		await renderModalOpen();
		await waitFor(() => expect(screen.getByText('short feedback form')).toBeInTheDocument());
	});

	it('calls closeModal when the dialog close control is used', async () => {
		await renderModalOpen();
		const uiStore = useUIStore();
		vi.spyOn(uiStore, 'closeModal');

		await waitFor(() => expect(screen.getByTestId('dialog-close-button')).toBeInTheDocument());
		await userEvent.click(screen.getByTestId('dialog-close-button'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('opens feedback URL when Send feedback is clicked', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		await renderModalOpen();

		await waitFor(() =>
			expect(screen.getByTestId('ai-gateway-topup-send-feedback')).toBeInTheDocument(),
		);
		await userEvent.click(screen.getByTestId('ai-gateway-topup-send-feedback'));

		expect(openSpy).toHaveBeenCalledWith(
			expect.stringContaining('forms.gle'),
			'_blank',
			'noopener,noreferrer',
		);
		openSpy.mockRestore();
	});
});
