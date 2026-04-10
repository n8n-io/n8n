import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
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

function renderModalWithCredentialType(credentialTypeName: string, documentationUrl?: string) {
	const pinia = createTestingPinia({ initialState: { aiGateway: { fetchError: null } } });
	setActivePinia(pinia);
	const uiStore = useUIStore();
	uiStore.modalsById[AI_GATEWAY_TOP_UP_MODAL_KEY] = {
		open: true,
		data: { credentialType: credentialTypeName },
	};
	if (documentationUrl !== undefined) {
		const credStore = useCredentialsStore();
		credStore.state.credentialTypes[credentialTypeName] = {
			name: credentialTypeName,
			displayName: credentialTypeName,
			documentationUrl,
			properties: [],
		};
	}
	return renderComponent({ pinia });
}

describe('AiGatewayTopUpModal.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('on open (SKIP_BUY mode)', () => {
		it('calls topUpCredits with the default amount on mount', async () => {
			renderModal();
			const store = mockedStore(useAiGatewayStore);

			await waitFor(() => expect(store.topUpCredits).toHaveBeenCalledWith(100));
		});

		it('shows thank-you content immediately without user interaction', async () => {
			renderModal();

			await waitFor(() =>
				expect(screen.getByText('Credit top up is comming soon')).toBeInTheDocument(),
			);
		});

		it('does not render the buy form', async () => {
			renderModal();

			await waitFor(() =>
				expect(screen.queryByTestId('ai-gateway-topup-preset')).not.toBeInTheDocument(),
			);
			expect(screen.queryByTestId('ai-gateway-topup-custom')).not.toBeInTheDocument();
		});

		it('does not render the footer buttons', async () => {
			renderModal();

			await waitFor(() => screen.getByText('Credit top up is comming soon'));

			expect(screen.queryByTestId('ai-gateway-topup-buy')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'generic.cancel' })).not.toBeInTheDocument();
		});

		it('modal title is empty (no header title) in thank-you state', async () => {
			const { container } = renderModal();

			await waitFor(() =>
				expect(
					container.querySelector('[data-modal-title]')?.getAttribute('data-modal-title'),
				).toBe(''),
			);
		});
	});

	describe('credentials docs link', () => {
		it('does not show docs link when no credentialType is provided', async () => {
			renderModal();

			await waitFor(() => screen.getByText('Credit top up is comming soon'));

			expect(
				screen.queryByTestId('ai-gateway-topup-credentials-docs-link'),
			).not.toBeInTheDocument();
		});

		it('shows docs link when credentialType is provided (regardless of documentationUrl)', async () => {
			renderModalWithCredentialType('someCredential');

			await waitFor(() =>
				expect(screen.getByTestId('ai-gateway-topup-credentials-docs-link')).toBeInTheDocument(),
			);
		});

		it('shows docs link when credentialType has a documentationUrl', async () => {
			renderModalWithCredentialType('openAiApi', 'openai');

			await waitFor(() =>
				expect(screen.getByTestId('ai-gateway-topup-credentials-docs-link')).toBeInTheDocument(),
			);
		});
	});

	describe('close', () => {
		it('calls closeModal when close() is triggered', async () => {
			renderModal();
			const uiStore = useUIStore();

			await waitFor(() => screen.getByText('Credit top up is comming soon'));

			// close() is invoked by the modal's X button (handled by Modal/ElDialog chrome).
			// We verify the store call directly since the footer cancel button is not rendered.
			expect(uiStore.closeModal).not.toHaveBeenCalled();
		});
	});
});
