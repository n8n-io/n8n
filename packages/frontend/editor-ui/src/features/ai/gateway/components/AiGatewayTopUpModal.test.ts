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

<<<<<<< HEAD
	it('does not render a credentials docs link', () => {
		renderModal();
		expect(screen.queryByTestId('ai-gateway-topup-credentials-docs-link')).not.toBeInTheDocument();
=======
	it('mails the Instance Owner when Contact admin is clicked', async () => {
		const { uiStore } = renderModal({
			variant: 'member',
			allUsers: [{ email: 'owner@example.com', role: ROLE.Owner } as IUser],
		});

		await userEvent.click(screen.getByRole('button', { name: 'Contact admin' }));

		expect(windowOpen).toHaveBeenCalledWith(
			'mailto:owner@example.com?subject=Gateway%20credits%20top-up',
		);
		expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('keeps Contact admin disabled until the owner lookup finishes', async () => {
		const fetchUsers = Promise.withResolvers<void>();
		renderModal({ variant: 'member', fetchUsers: () => fetchUsers.promise });

		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeDisabled();

		fetchUsers.resolve();
		await flushPromises();

		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeEnabled();
	});

	it('opens a blank mailto when no Instance Owner email is available', async () => {
		renderModal({
			variant: 'member',
			allUsers: [{ email: '', role: ROLE.Owner } as IUser],
		});
		await flushPromises();

		await userEvent.click(screen.getByRole('button', { name: 'Contact admin' }));

		expect(windowOpen).toHaveBeenCalledWith('mailto:?subject=Gateway%20credits%20top-up');
	});

	it('closes the dialog when Cancel is clicked', async () => {
		const { uiStore } = renderModal({ variant: 'member' });

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('ignores update:open true so the dialog stays open', async () => {
		const { uiStore } = renderModal({ variant: 'member' });

		await userEvent.click(screen.getByTestId('ai-gateway-topup-keep-open'));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(uiStore.closeModal).not.toHaveBeenCalled();
	});

	it('shows Upgrade copy and covered services for owners during trial', async () => {
		renderModal({ variant: 'ownerTrial' });

		expect(screen.getByText('Upgrade your plan to top-up')).toBeInTheDocument();
		expect(screen.getByText(/Access to a paid plan is required/)).toBeInTheDocument();
		expect(screen.getByText('Zero setup access to:')).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-services')).toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

		expect(mockGoToUpgrade).toHaveBeenCalledWith('ai-gateway-top-up', 'upgrade-ai-gateway-top-up');
	});

	it('names every featured partner, installed or not', () => {
		renderModal({ variant: 'ownerTrial' });

		for (const name of [
			'OpenAI',
			'Anthropic',
			'Google Gemini',
			'MiniMax',
			'Moonshot',
			'Qwen Cloud',
			'Firecrawl',
			'Browserbase',
			'Brave Search',
			'PDF.co',
			'LlamaIndex',
		]) {
			expect(screen.getByText(name)).toBeInTheDocument();
		}
	});

	it('shows a logo for every featured partner, installed or not', () => {
		renderModal({ variant: 'ownerTrial' });

		for (const credentialType of [
			'openAiApi',
			'anthropicApi',
			'googlePalmApi',
			'minimaxApi',
			'moonshotApi',
			'alibabaCloudApi',
			'firecrawlApi',
			'browserbaseApi',
			'braveSearchApi',
			'pdfcoApi',
			'llamaParseApi',
		]) {
			expect(screen.getByTestId(`service-logo-${credentialType}`)).toBeInTheDocument();
		}
>>>>>>> 67183927 (feat(editor): Rename n8n credits and n8n Connect copy to Gateway credits in the UI (#37267))
	});
});
