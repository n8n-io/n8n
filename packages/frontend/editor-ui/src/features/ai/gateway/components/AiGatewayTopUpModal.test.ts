import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';
import { createComponentRenderer } from '@/__tests__/render';

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

	it('does not render a credentials docs link', () => {
		renderModal();
		expect(screen.queryByTestId('ai-gateway-topup-credentials-docs-link')).not.toBeInTheDocument();
	});
});
