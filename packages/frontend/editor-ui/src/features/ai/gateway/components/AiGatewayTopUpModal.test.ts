import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		props: ['name', 'title'],
		template:
			'<div :data-modal-name="name" :data-modal-title="title"><slot name="content" /><slot name="footer" /></div>',
	},
}));

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

function renderModal() {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	return { ...renderComponent({ pinia }), pinia };
}

function renderModalWithCredentialType(
	credentialTypeName: string,
	options: { displayName?: string; documentationUrl?: string } = {},
) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const uiStore = useUIStore();
	uiStore.modalsById[AI_GATEWAY_TOP_UP_MODAL_KEY] = {
		open: true,
		data: { credentialType: credentialTypeName },
	};
	const credStore = useCredentialsStore();
	credStore.state.credentialTypes[credentialTypeName] = {
		name: credentialTypeName,
		displayName: options.displayName ?? credentialTypeName,
		documentationUrl: options.documentationUrl,
		properties: [],
	};
	return renderComponent({ pinia });
}

describe('AiGatewayTopUpModal.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows the coming-soon content', () => {
		renderModal();
		expect(screen.getByText('Top up is coming soon')).toBeInTheDocument();
	});

	it('does not render any buy UI or footer buttons', () => {
		renderModal();
		expect(screen.queryByTestId('ai-gateway-topup-preset')).not.toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-custom')).not.toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-buy')).not.toBeInTheDocument();
	});

	describe('credentials docs link', () => {
		it('does not show docs link when no credentialType is provided', () => {
			renderModal();
			expect(
				screen.queryByTestId('ai-gateway-topup-credentials-docs-link'),
			).not.toBeInTheDocument();
		});

		it('shows descriptive docs link with credential display name', () => {
			renderModalWithCredentialType('openAiApi', { displayName: 'OpenAI' });
			const link = screen.getByTestId('ai-gateway-topup-credentials-docs-link');
			expect(link).toBeInTheDocument();
			expect(link.textContent).toContain('See how to configure the OpenAI credential');
		});

		it('shows docs link when credentialType has a documentationUrl', () => {
			renderModalWithCredentialType('openAiApi', { documentationUrl: 'openai' });
			expect(screen.getByTestId('ai-gateway-topup-credentials-docs-link')).toBeInTheDocument();
		});
	});
});
