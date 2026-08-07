import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { ICredentialType } from 'n8n-workflow';
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

const KNOWN_CREDENTIAL_TYPES: Record<string, string> = {
	openAiApi: 'OpenAI',
	anthropicApi: 'Anthropic',
	googlePalmApi: 'Google Gemini(PaLM) Api',
	serpApi: 'SerpAPI',
	firecrawlApi: 'Firecrawl',
	browserbaseApi: 'Browserbase',
	pdfcoApi: 'PDF.co',
	scrapelessApi: 'Scrapeless',
};

function renderModal({
	isInstanceOwner,
	userIsTrialing,
	credentialTypes,
}: {
	isInstanceOwner: boolean;
	userIsTrialing: boolean;
	credentialTypes?: string[];
}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const usersStore = mockedStore(useUsersStore);
	const cloudPlanStore = mockedStore(useCloudPlanStore);
	const aiGatewayStore = mockedStore(useAiGatewayStore);
	const credentialsStore = mockedStore(useCredentialsStore);
	usersStore.isInstanceOwner = isInstanceOwner;
	cloudPlanStore.userIsTrialing = userIsTrialing;
	aiGatewayStore.config = {
		credentialTypes: credentialTypes ?? ['openAiApi', 'anthropicApi'],
	} as AiGatewayConfigDto;
	credentialsStore.getCredentialTypeByName = (name: string) =>
		KNOWN_CREDENTIAL_TYPES[name]
			? ({ name, displayName: KNOWN_CREDENTIAL_TYPES[name] } as ICredentialType)
			: undefined;
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
		expect(screen.getByText('Anthropic')).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-close')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-upgrade')).not.toBeInTheDocument();
	});

	it('lists the services the gateway covers, dropping types this instance cannot render', () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			credentialTypes: ['someUnknownApi', 'firecrawlApi', 'openAiApi'],
		});

		expect(screen.getByText('Firecrawl')).toBeInTheDocument();
		expect(screen.getByText('OpenAI')).toBeInTheDocument();
		expect(screen.queryByText('someUnknownApi')).not.toBeInTheDocument();
	});

	it('trims the credential-picker suffix from partner names', () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			credentialTypes: ['googlePalmApi', 'serpApi'],
		});

		expect(screen.getByText('Google Gemini(PaLM)')).toBeInTheDocument();
		expect(screen.getByText('SerpAPI')).toBeInTheDocument();
	});

	it('summarises the remainder when the gateway covers more than the preview fits', () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			credentialTypes: Object.keys(KNOWN_CREDENTIAL_TYPES),
		});

		expect(screen.getByText('and 2 more services')).toBeInTheDocument();
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
