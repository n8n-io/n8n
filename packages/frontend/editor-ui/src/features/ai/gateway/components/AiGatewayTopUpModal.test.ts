import { describe, it, vi, beforeEach, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ROLE } from '@n8n/api-types';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@n8n/stores/users.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import type { AiGatewayTopUpVariant } from '@/app/composables/useAiGatewayTopUp';
import { useUIStore } from '@/app/stores/ui.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';

const mockGoToUpgrade = vi.fn();

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: mockGoToUpgrade,
	}),
}));

// N8nAlertDialog (reka-ui) doesn't render its portalled content in jsdom.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nAlertDialog: {
			name: 'N8nAlertDialog',
			props: ['open', 'title', 'description', 'actionLabel', 'cancelLabel', 'size', 'loading'],
			emits: ['action', 'cancel', 'update:open'],
			template: `
				<div v-if="open" role="dialog" data-test-id="ai-gateway-topup-modal">
					<h2>{{ title }}</h2>
					<p>{{ description }}</p>
					<slot />
					<button type="button" @click="$emit('cancel'); $emit('update:open', false)">{{ cancelLabel }}</button>
					<button type="button" data-test-id="ai-gateway-topup-keep-open" @click="$emit('update:open', true)">keep</button>
					<button type="button" :disabled="loading" @click="$emit('action')">{{ actionLabel }}</button>
				</div>
			`,
		},
	};
});

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

function renderModal({
	variant,
	allUsers = [],
	fetchUsers,
}: {
	variant: AiGatewayTopUpVariant;
	allUsers?: IUser[];
	fetchUsers?: () => Promise<void>;
}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const usersStore = mockedStore(useUsersStore);
	const uiStore = mockedStore(useUIStore);
	usersStore.allUsers = allUsers;
	usersStore.fetchUsers = fetchUsers
		? vi.fn().mockImplementation(fetchUsers)
		: vi.fn().mockResolvedValue(undefined);
	renderComponent({ pinia, props: { variant } });
	return { usersStore, uiStore };
}

describe('AiGatewayTopUpModal.vue', () => {
	const windowOpen = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('open', windowOpen);
	});

	it('shows the contact-admin alert for non-owners on a paid plan', () => {
		renderModal({ variant: 'member' });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Contact your admin to top-up')).toBeInTheDocument();
		expect(screen.getByText(/Only the Instance Owner can top up/)).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-services')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
	});

	it('tells trial non-owners that the Instance Owner must upgrade and top up', () => {
		const { usersStore } = renderModal({ variant: 'memberTrial' });

		expect(screen.getByText('Contact your admin to top-up')).toBeInTheDocument();
		expect(screen.getByText(/needs to upgrade to a paid plan/)).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-services')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
		expect(usersStore.fetchUsers).toHaveBeenCalledWith({ filter: { isOwner: true } });
	});

	it('mails the Instance Owner when Contact admin is clicked', async () => {
		const { uiStore } = renderModal({
			variant: 'member',
			allUsers: [{ email: 'owner@example.com', role: ROLE.Owner } as IUser],
		});

		await userEvent.click(screen.getByRole('button', { name: 'Contact admin' }));

		expect(windowOpen).toHaveBeenCalledWith(
			'mailto:owner@example.com?subject=n8n%20credits%20top-up',
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

		expect(windowOpen).toHaveBeenCalledWith('mailto:?subject=n8n%20credits%20top-up');
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
	});
});
