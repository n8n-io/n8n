import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ROLE } from '@n8n/api-types';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
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
			props: ['open', 'title', 'description', 'actionLabel', 'cancelLabel', 'size'],
			emits: ['action', 'cancel', 'update:open'],
			template: `
				<div v-if="open" role="dialog" data-test-id="ai-gateway-topup-modal">
					<h2>{{ title }}</h2>
					<p>{{ description }}</p>
					<slot />
					<button type="button" @click="$emit('cancel'); $emit('update:open', false)">{{ cancelLabel }}</button>
					<button type="button" data-test-id="ai-gateway-topup-keep-open" @click="$emit('update:open', true)">keep</button>
					<button type="button" @click="$emit('action')">{{ actionLabel }}</button>
				</div>
			`,
		},
	};
});

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

const INSTALLED_CREDENTIAL_TYPES: Record<string, Partial<ICredentialType>> = {
	openAiApi: { displayName: 'OpenAI', iconUrl: 'icons/openAi.svg' },
	anthropicApi: { displayName: 'Anthropic', iconUrl: 'icons/anthropic.svg' },
	googlePalmApi: { displayName: 'Google Gemini(PaLM) Api', iconUrl: 'icons/gemini.svg' },
	moonshotApi: { displayName: 'Moonshot API', iconUrl: 'icons/moonshot.svg' },
	miniMaxApi: { displayName: 'MiniMax Account' },
	openAiAssistantApi: { displayName: 'OpenAI', iconUrl: 'icons/openAi.svg' },
	qwenApi: { displayName: 'Qwen Cloud', icon: 'file:qwen.svg' },
};

const INSTALLED_NODE_TYPES = [
	{ name: 'noCredentials' },
	{ name: 'miniMax', credentials: [{ name: 'miniMaxApi' }] },
	{ name: 'openAi', credentials: [{ name: 'openAiApi' }] },
	{ name: 'openAiChat', credentials: [{ name: 'openAiApi' }] },
	{ name: 'cohere', displayName: 'Cohere API', credentials: [{ name: 'cohereApi' }] },
] as unknown as INodeTypeDescription[];

function renderModal({
	isInstanceOwner,
	userIsTrialing,
	credentialTypes,
	allUsers = [],
	config,
}: {
	isInstanceOwner: boolean;
	userIsTrialing: boolean;
	credentialTypes?: string[];
	allUsers?: IUser[];
	config?: AiGatewayConfigDto | null;
}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const usersStore = mockedStore(useUsersStore);
	const cloudPlanStore = mockedStore(useCloudPlanStore);
	const aiGatewayStore = mockedStore(useAiGatewayStore);
	const credentialsStore = mockedStore(useCredentialsStore);
	const nodeTypesStore = mockedStore(useNodeTypesStore);
	const uiStore = mockedStore(useUIStore);
	nodeTypesStore.allLatestNodeTypes = INSTALLED_NODE_TYPES;
	usersStore.isInstanceOwner = isInstanceOwner;
	usersStore.allUsers = allUsers;
	usersStore.fetchUsers = vi.fn().mockResolvedValue(undefined);
	cloudPlanStore.userIsTrialing = userIsTrialing;
	aiGatewayStore.config =
		config === undefined
			? ({
					credentialTypes: credentialTypes ?? ['openAiApi', 'anthropicApi'],
				} as AiGatewayConfigDto)
			: config;
	credentialsStore.getCredentialTypeByName = (name: string) =>
		INSTALLED_CREDENTIAL_TYPES[name]
			? ({ name, ...INSTALLED_CREDENTIAL_TYPES[name] } as ICredentialType)
			: undefined;
	renderComponent({ pinia });
	return { usersStore, uiStore };
}

describe('AiGatewayTopUpModal.vue', () => {
	const windowOpen = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('open', windowOpen);
	});

	it('shows the contact-admin alert for non-owners on a paid plan', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: false });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Contact your admin to top-up')).toBeInTheDocument();
		expect(screen.getByText(/Only the Instance Owner can top up/)).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-services')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
	});

	it('tells trial non-owners that the Instance Owner must upgrade and top up', () => {
		renderModal({ isInstanceOwner: false, userIsTrialing: true });

		expect(screen.getByText('Contact your admin to top-up')).toBeInTheDocument();
		expect(screen.getByText(/needs to upgrade to a paid plan/)).toBeInTheDocument();
		expect(screen.queryByTestId('ai-gateway-topup-services')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Contact admin' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
	});

	it('mails the Instance Owner when Contact admin is clicked', async () => {
		const { uiStore } = renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			allUsers: [{ email: 'owner@example.com', role: ROLE.Owner } as IUser],
		});

		await userEvent.click(screen.getByRole('button', { name: 'Contact admin' }));

		expect(windowOpen).toHaveBeenCalledWith(
			'mailto:owner@example.com?subject=n8n%20credits%20top-up',
		);
		expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('opens a blank mailto when no Instance Owner email is available', async () => {
		renderModal({
			isInstanceOwner: false,
			userIsTrialing: false,
			allUsers: [{ email: '', role: ROLE.Owner } as IUser],
		});

		await userEvent.click(screen.getByRole('button', { name: 'Contact admin' }));

		expect(windowOpen).toHaveBeenCalledWith('mailto:?subject=n8n%20credits%20top-up');
	});

	it('closes the dialog when Cancel is clicked', async () => {
		const { uiStore } = renderModal({ isInstanceOwner: false, userIsTrialing: false });

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(uiStore.closeModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('ignores update:open true so the dialog stays open', async () => {
		const { uiStore } = renderModal({ isInstanceOwner: false, userIsTrialing: false });

		await userEvent.click(screen.getByTestId('ai-gateway-topup-keep-open'));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(uiStore.closeModal).not.toHaveBeenCalled();
	});

	it('shows Upgrade copy and covered services for owners during trial', async () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: true });

		expect(screen.getByText('Upgrade your plan to top-up')).toBeInTheDocument();
		expect(screen.getByText(/Access to a paid plan is required/)).toBeInTheDocument();
		expect(screen.getByText('Zero setup access to:')).toBeInTheDocument();
		expect(screen.getByTestId('ai-gateway-topup-services')).toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

		expect(mockGoToUpgrade).toHaveBeenCalledWith('ai-gateway-top-up', 'upgrade-ai-gateway-top-up');
	});

	it('names every featured partner, installed or not', () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: true });

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

	it('shows a logo for every featured partner, installed or not', () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: true });

		expect(screen.getByTestId('credential-icon-openAiApi')).toBeInTheDocument();
		for (const credentialType of [
			'firecrawlApi',
			'browserbaseApi',
			'braveSearchApi',
			'pdfcoApi',
			'llamaParseApi',
		]) {
			expect(screen.getByTestId(`service-logo-${credentialType}`)).toBeInTheDocument();
		}
	});

	it("falls back to the node's logo for credentials that ship none", () => {
		renderModal({
			isInstanceOwner: true,
			userIsTrialing: true,
			credentialTypes: ['openAiApi', 'miniMaxApi'],
		});

		expect(screen.getByTestId('node-icon-miniMax')).toBeInTheDocument();
	});

	it('lists every service the gateway covers, named as brands', () => {
		renderModal({
			isInstanceOwner: true,
			userIsTrialing: true,
			credentialTypes: ['openAiApi', 'moonshotApi', 'miniMaxApi'],
		});

		expect(screen.getByText('Moonshot')).toBeInTheDocument();
		expect(screen.getByText('MiniMax')).toBeInTheDocument();
	});

	it('shows one tile per vendor and skips services it cannot name', () => {
		renderModal({
			isInstanceOwner: true,
			userIsTrialing: true,
			credentialTypes: ['openAiApi', 'openAiAssistantApi', 'mysteryApi'],
		});

		expect(screen.getAllByText('OpenAI')).toHaveLength(1);
		expect(screen.queryByText('mysteryApi')).not.toBeInTheDocument();
	});

	it('still lists featured partners when gateway config has not loaded', () => {
		renderModal({ isInstanceOwner: true, userIsTrialing: true, config: null });

		expect(screen.getByText('Firecrawl')).toBeInTheDocument();
		expect(screen.getByText('OpenAI')).toBeInTheDocument();
	});

	it('uses a credential icon field when iconUrl is absent', () => {
		renderModal({
			isInstanceOwner: true,
			userIsTrialing: true,
			credentialTypes: ['openAiApi', 'qwenApi'],
		});

		expect(screen.getByTestId('credential-icon-qwenApi')).toBeInTheDocument();
	});

	it('names a covered service from its node when the credential type is unknown', () => {
		renderModal({
			isInstanceOwner: true,
			userIsTrialing: true,
			credentialTypes: ['openAiApi', 'cohereApi'],
		});

		expect(screen.getByText('Cohere')).toBeInTheDocument();
		expect(screen.getByTestId('node-icon-cohere')).toBeInTheDocument();
	});
});
