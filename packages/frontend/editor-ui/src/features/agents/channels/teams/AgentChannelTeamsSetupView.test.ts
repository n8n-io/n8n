import { createComponentRenderer } from '@/__tests__/render';
import type { TeamsManagedSetupState } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

import AgentChannelTeamsSetupKindSelector from './AgentChannelTeamsSetupKindSelector.vue';
import AgentChannelTeamsSetupView from './AgentChannelTeamsSetupView.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn().mockResolvedValue({ status: 'ok' }),
	getTeamsSetupState: vi.fn().mockResolvedValue({
		messagingEndpointUrl: 'https://n8n.example.com/webhook',
		botId: null,
		deployToAzureUrl: null,
		credentialClaimedBy: null,
		provisionedByN8n: true,
		defaultDisplayName: 'Agent',
		defaultDescription: 'An agent',
	}),
	fetchTeamsAppPackage: vi.fn(),
	getTeamsManagedSetup: vi.fn(),
	createTeamsManagerCredential: vi.fn(),
}));

configure({ testIdAttribute: 'data-testid' });

const buildRuntime = (
	managedSetup: TeamsManagedSetupState,
	loading = false,
): TeamsChannelRuntime => {
	const isLoading = ref(loading);
	return {
		managedSetup: ref(managedSetup),
		setupKind: ref('managed'),
		managerCredentialId: ref(''),
		loading: computed(() => isLoading.value),
		load: vi.fn(),
		connectManagerCredential: vi.fn().mockResolvedValue(true),
		editManagerCredential: vi.fn(),
		provisionedApp: ref(null),
		botSetupState: ref(null),
		provisionedBot: ref(null),
		subscriptions: ref([]),
		catalogState: ref(null),
		connectedCredentialId: ref(''),
			provisionApp: vi.fn(),
		loadSubscriptions: vi.fn(),
		provisionBot: vi.fn(),
		publishApp: vi.fn(),
		refreshCatalogState: vi.fn(),
		};
};

const props = (runtime: TeamsChannelRuntime, overrides: Record<string, unknown> = {}) => ({
	mode: 'setup' as const,
	modelValue: '',
	integration: {
		type: 'teams',
		label: 'Microsoft Teams',
		icon: 'teams',
		credentialTypes: ['microsoftEntraServicePrincipalApi'],
	},
	credentials: [],
	credentialPermissions: { create: true, update: true },
	credentialsLoading: false,
	loading: false,
	connected: false,
	connectedDescription: '',
	errorMessage: '',
	errorIsConflict: false,
	isPublished: true,
	agentName: 'agent-1',
	projectId: 'project-1',
	agentId: 'agent-1',
	forceNewCredential: false,
	simpleSetup: false,
	runtime,
	...overrides,
});

const renderView = createComponentRenderer(AgentChannelTeamsSetupView);
const renderSelector = createComponentRenderer(AgentChannelTeamsSetupKindSelector);

describe('AgentChannelTeamsSetupView', () => {
	beforeEach(() => vi.clearAllMocks());

	it('opens on the recommended flow when it is available', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { getByTestId } = renderView({
			props: props(runtime),
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-managed-stepper')).toBeVisible());
	});

	it('falls back to the manual stepper when the recommended flow is unavailable', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: false,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { queryByTestId, getByText } = renderView({
			props: props(runtime),
			pinia: createTestingPinia(),
		});

		await waitFor(() => {
			expect(getByText('agents.channels.teams.setup.createCredential.title')).toBeVisible();
		});
		expect(queryByTestId('teams-managed-stepper')).not.toBeInTheDocument();
	});

	/**
	 * The manual flow connects itself once the package is downloaded, and again
	 * from its retry. Both reach the modal through this wrapper, so a wrapper
	 * that does not forward the event silently ends that flow.
	 */
	it('forwards a connect raised by the manual flow', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: false,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { emitted, getByTestId } = renderView({
			// The retry only shows once a connect has failed, which is the state it
			// exists for.
			props: props(runtime, { errorMessage: 'Teams refused the connection' }),
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-connect-retry')).toBeVisible());
		await fireEvent.click(getByTestId('teams-connect-retry'));

		expect(emitted('connect')).toHaveLength(1);
	});

	/**
	 * Both flows run steps past the connect, so the modal must not close on it.
	 * The wrapper has swallowed a child event before, and this one decides
	 * whether the dialog shuts while the setup is still going.
	 */
	it('tells the modal to stay open while a flow is still running', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const Host = defineComponent({
			components: { AgentChannelTeamsSetupView },
			setup: () => ({ view: ref<{ keepOpenAfterConnect?: boolean }>(), hostProps: props(runtime) }),
			template: `
				<div>
					<AgentChannelTeamsSetupView ref="view" v-bind="hostProps" />
					<span data-testid="keep-open">{{ String(view?.keepOpenAfterConnect) }}</span>
				</div>
			`,
		});

		const { getByTestId } = createComponentRenderer(Host)({ pinia: createTestingPinia() });

		await waitFor(() => expect(getByTestId('keep-open')).toHaveTextContent('true'));
	});

	it('shows the manual stepper when the user switches mode', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { queryByTestId, getByText } = renderView({
			props: props(runtime),
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(queryByTestId('teams-managed-stepper')).toBeInTheDocument());

		// Opening the setup always starts on the recommended flow, so the switch
		// only means anything once the view is already mounted.
		runtime.setupKind.value = 'manual';

		await waitFor(() => {
			expect(getByText('agents.channels.teams.setup.createCredential.title')).toBeVisible();
		});
		expect(queryByTestId('teams-managed-stepper')).not.toBeInTheDocument();
	});

	/**
	 * The save reads the settings off whichever flow is on screen. Reading the
	 * manual one while the recommended flow is showing stored the defaults, so
	 * the availability the user chose was lost.
	 */
	it('mounts only the flow whose settings the save will read', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { getByTestId, queryByText } = renderView({
			props: props(runtime, { savedSettings: { sessionIdleTimeoutMinutes: 30 } }),
			pinia: createTestingPinia(),
		});

		// `currentSettings` delegates to whichever flow is mounted, so the thing
		// to hold is that exactly one of them is. The settings themselves are
		// covered where each flow builds them.
		await waitFor(() => expect(getByTestId('teams-managed-stepper')).toBeVisible());
		expect(queryByText('agents.channels.teams.setup.createCredential.title')).toBeNull();
	});

	/**
	 * Reopening a finished setup never runs the step that binds the credential,
	 * so the flow's own flag stays false. Without this the user lands on a
	 * setup with nothing left to do and no way out but Cancel.
	 */
	it('lets the modal finish when the channel is already connected', async () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'm-1',
					name: 'Microsoft',
					connected: true,
					reconnectRequired: false,
					organizationName: 'Acme Corp',
					tenantId: 'tenant-1',
				},
			],
			adminConsentUrl: null,
		});

		const Host = defineComponent({
			components: { AgentChannelTeamsSetupView },
			props: { hostProps: { type: Object, required: true } },
			setup: () => ({ view: ref<{ canFinish?: boolean }>() }),
			template: `
				<div>
					<AgentChannelTeamsSetupView ref="view" v-bind="hostProps" />
					<span data-testid="can-finish">{{ String(view?.canFinish) }}</span>
				</div>
			`,
		});

		const { getByTestId } = createComponentRenderer(Host)({
			props: { hostProps: { ...props(runtime), connected: true } },
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('can-finish')).toHaveTextContent('true'));
	});

	it('shows a skeleton while the setup state is loading', () => {
		const runtime = buildRuntime(
			{ managedSetupAvailable: true, managerCredentials: [], adminConsentUrl: null },
			true,
		);

		const { getByTestId } = renderView({
			props: props(runtime),
			pinia: createTestingPinia(),
		});

		expect(getByTestId('teams-managed-setup-skeleton')).toBeVisible();
	});

	/**
	 * The state is reloaded whenever the credential modal closes, which happens
	 * mid-flow. Showing the skeleton again then collapsed the dialog and threw
	 * away the step the user had reached.
	 */
	it('keeps the stepper on screen when the state reloads mid-flow', async () => {
		const isLoading = ref(true);
		const runtime = {
			...buildRuntime(
				{ managedSetupAvailable: true, managerCredentials: [], adminConsentUrl: null },
				true,
			),
			loading: computed(() => isLoading.value),
		} as TeamsChannelRuntime;

		const { getByTestId, queryByTestId } = renderView({
			props: props(runtime),
			pinia: createTestingPinia(),
		});

		expect(getByTestId('teams-managed-setup-skeleton')).toBeVisible();

		isLoading.value = false;
		await waitFor(() => expect(getByTestId('teams-managed-stepper')).toBeVisible());

		isLoading.value = true;
		await waitFor(() => expect(getByTestId('teams-managed-stepper')).toBeVisible());
		expect(queryByTestId('teams-managed-setup-skeleton')).not.toBeInTheDocument();
	});
});

describe('AgentChannelTeamsSetupKindSelector', () => {
	it('offers the mode picker when the recommended flow is available', () => {
		const runtime = buildRuntime({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { getByTestId } = renderSelector({
			props: { runtime },
			pinia: createTestingPinia(),
		});

		expect(getByTestId('teams-setup-kind-selector')).toBeVisible();
	});

	it('hides the mode picker when the recommended flow is unavailable', () => {
		const runtime = buildRuntime({
			managedSetupAvailable: false,
			managerCredentials: [],
			adminConsentUrl: null,
		});

		const { queryByTestId } = renderSelector({
			props: { runtime },
			pinia: createTestingPinia(),
		});

		expect(queryByTestId('teams-setup-kind-selector')).not.toBeInTheDocument();
	});
});
