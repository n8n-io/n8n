import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';

const mockGoToUpgrade = vi.fn();

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: mockGoToUpgrade,
	}),
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		props: ['name', 'title'],
		template:
			'<div :data-modal-name="name" :data-modal-title="title"><slot name="content" /><slot name="footer" :close="() => {}" /></div>',
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		props: ['credentialTypeName', 'size'],
		template: '<span :data-credential-type="credentialTypeName" />',
	},
}));

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

function renderModal({
	isInstanceOwner,
	userIsTrialing,
}: {
	isInstanceOwner: boolean;
	userIsTrialing: boolean;
}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const usersStore = mockedStore(useUsersStore);
	const cloudPlanStore = mockedStore(useCloudPlanStore);
	usersStore.isInstanceOwner = isInstanceOwner;
	cloudPlanStore.userIsTrialing = userIsTrialing;
	return renderComponent({ pinia });
}

describe('AiGatewayTopUpModal.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows member copy for non-owners on a paid plan', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: false });

		expect(screen.getByText('Top up n8n credits')).toBeInTheDocument();
		expect(screen.getByText(/Only the Instance Owner can top up/)).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-services')).toBeInTheDocument();
		expect(screen.getByText('OpenAI')).toBeInTheDocument();
		expect(screen.getByText('Firecrawl')).toBeInTheDocument();
		expect(screen.getByText('Browserbase')).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-close')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-upgrade')).not.toBeInTheDocument();
	});

	it('shows owner copy for owners when the Cloud redirect is unavailable', () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: false });

		expect(screen.getByText(/Top up credits and configure auto-top-up/)).toBeInTheDocument();
		expect(screen.queryByText(/Only the Instance Owner/)).not.toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-upgrade')).not.toBeInTheDocument();
	});

	it('shows trial copy for non-owners during trial', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: true });

		expect(screen.getByText('Top up requires a paid plan')).toBeInTheDocument();
		expect(
			screen.getByText(/once this instance is upgraded to a paid Cloud plan/),
		).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-upgrade')).not.toBeInTheDocument();
	});

	it('shows Upgrade CTA for owners during trial', async () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: true });

		expect(screen.getByText('Top up requires a paid plan')).toBeInTheDocument();
		expect(
			screen.getByText(/once your instance has an active paid Cloud subscription/),
		).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('ai-gateway-topup-upgrade'));

		expect(mockGoToUpgrade).toHaveBeenCalledWith('ai-gateway-top-up', 'upgrade-ai-gateway-top-up');
	});
});
