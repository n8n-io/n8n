import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import AiGatewayTopUpModal from './AiGatewayTopUpModal.vue';

const mockGoToUpgrade = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: mockGoToUpgrade,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
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
		template: '<span :data-test-id="`credential-icon-${credentialTypeName}`" />',
	},
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'size'],
		template: '<span :data-test-id="`node-icon-${nodeType.name}`" />',
	},
}));

const renderComponent = createComponentRenderer(AiGatewayTopUpModal);

// Credential types this instance knows about. Only the built-in providers ship a logo;
// the community-node partners are registered on demand, so they render name-only.
const INSTALLED_CREDENTIAL_TYPES: Record<string, Partial<ICredentialType>> = {
	openAiApi: { displayName: 'OpenAI', iconUrl: 'icons/openAi.svg' },
	anthropicApi: { displayName: 'Anthropic', iconUrl: 'icons/anthropic.svg' },
	googlePalmApi: { displayName: 'Google Gemini(PaLM) Api', iconUrl: 'icons/gemini.svg' },
	braveSearchApi: { displayName: 'Brave Search' },
	pdfcoApi: { displayName: 'PDF.co' },
	moonshotApi: { displayName: 'Moonshot API', iconUrl: 'icons/moonshot.svg' },
	miniMaxApi: { displayName: 'MiniMax Account' },
	openAiAssistantApi: { displayName: 'OpenAI', iconUrl: 'icons/openAi.svg' },
};

// Community packages keep the logo on the node rather than the credential.
const INSTALLED_NODE_TYPES = [
	{ name: 'n8n-nodes-pdfco.pdfco', credentials: [{ name: 'pdfcoApi' }] },
	{ name: 'openAi', credentials: [{ name: 'openAiApi' }] },
] as unknown as INodeTypeDescription[];

function renderModal({
	isInstanceOwner,
	userIsTrialing,
	isCloudDeployment = false,
	credentialTypes,
}: {
	isInstanceOwner: boolean;
	userIsTrialing: boolean;
	isCloudDeployment?: boolean;
	credentialTypes?: string[];
}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const usersStore = mockedStore(useUsersStore);
	const cloudPlanStore = mockedStore(useCloudPlanStore);
	const settingsStore = mockedStore(useSettingsStore);
	const aiGatewayStore = mockedStore(useAiGatewayStore);
	const credentialsStore = mockedStore(useCredentialsStore);
	const nodeTypesStore = mockedStore(useNodeTypesStore);
	nodeTypesStore.allLatestNodeTypes = INSTALLED_NODE_TYPES;
	usersStore.isInstanceOwner = isInstanceOwner;
	cloudPlanStore.userIsTrialing = userIsTrialing;
	settingsStore.isCloudDeployment = isCloudDeployment;
	aiGatewayStore.config = {
		credentialTypes: credentialTypes ?? ['openAiApi', 'anthropicApi'],
	} as AiGatewayConfigDto;
	credentialsStore.getCredentialTypeByName = (name: string) =>
		INSTALLED_CREDENTIAL_TYPES[name]
			? ({ name, ...INSTALLED_CREDENTIAL_TYPES[name] } as ICredentialType)
			: undefined;
	renderComponent({ pinia });
	return { cloudPlanStore };
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

	it('names every featured partner, installed or not', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: false });

		for (const name of [
			'OpenAI',
			'Anthropic',
			'Google Gemini',
			'Firecrawl',
			'Browserbase',
			'Brave Search',
			'PDF.co',
			'LlamaIndex',
		]) {
			expect(screen.getByText(name)).toBeInTheDocument();
		}
	});

	it('uses the credential logo when it has one', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: false });

		expect(screen.getByTestId('credential-icon-openAiApi')).toBeInTheDocument();
		expect(screen.queryByTestId('credential-icon-pdfcoApi')).not.toBeInTheDocument();
	});

	it("falls back to the node's logo for credentials that ship none", () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: false });

		// PDF.co keeps its logo on the node; Brave Search has neither, so it stays name-only.
		expect(screen.getByTestId('node-icon-n8n-nodes-pdfco.pdfco')).toBeInTheDocument();
		expect(screen.getByText('Brave Search')).toBeInTheDocument();
		expect(screen.queryByTestId('node-icon-braveSearch')).not.toBeInTheDocument();
	});

	it('lists every service the gateway covers, named as brands', () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			credentialTypes: ['openAiApi', 'moonshotApi', 'miniMaxApi'],
		});

		expect(screen.getByText('Moonshot')).toBeInTheDocument();
		expect(screen.getByText('MiniMax')).toBeInTheDocument();
	});

	it('shows one tile per vendor and skips services it cannot name', () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			credentialTypes: ['openAiApi', 'openAiAssistantApi', 'mysteryApi'],
		});

		expect(screen.getAllByText('OpenAI')).toHaveLength(1);
		expect(screen.queryByText('mysteryApi')).not.toBeInTheDocument();
	});

	it('shows owner copy without the Admin Panel link off Cloud', () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: false });

		expect(screen.getByText(/Top up credits and configure auto-top-up/)).toBeInTheDocument();
		expect(screen.queryByText(/Only the Instance Owner/)).not.toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-upgrade')).not.toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-admin-panel')).not.toBeInTheDocument();
	});

	it('links paid Cloud owners to the Admin Panel top-up page', async () => {
		const windowOpen = vi.fn();
		vi.stubGlobal('open', windowOpen);
		const { cloudPlanStore } = renderModal({
			isInstanceOwner: true,
			userIsTrialing: false,
			isCloudDeployment: true,
		});
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockResolvedValue('https://app.n8n.cloud/login?code=abc&returnPath=%2Fmanage%2Fconnect');

		await userEvent.click(screen.getByTestId('ai-gateway-topup-admin-panel'));

		expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).toHaveBeenCalledWith({
			redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
		});
		expect(windowOpen).toHaveBeenCalledWith(
			'https://app.n8n.cloud/login?code=abc&returnPath=%2Fmanage%2Fconnect',
			'_blank',
			'noopener',
		);
	});

	it('keeps the modal open and reports the error when the login link fails', async () => {
		const windowOpen = vi.fn();
		vi.stubGlobal('open', windowOpen);
		const { cloudPlanStore } = renderModal({
			isInstanceOwner: true,
			userIsTrialing: false,
			isCloudDeployment: true,
		});
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockRejectedValue(new Error('no auto-login code'));

		await userEvent.click(screen.getByTestId('ai-gateway-topup-admin-panel'));

		expect(windowOpen).not.toHaveBeenCalled();
		expect(mockShowError).toHaveBeenCalled();
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
