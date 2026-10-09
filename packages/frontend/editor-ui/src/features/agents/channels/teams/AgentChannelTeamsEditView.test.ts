import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';

import AgentChannelTeamsEditView from './AgentChannelTeamsEditView.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { fetchTeamsAppPackage, getTeamsSetupState } from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	fetchTeamsAppPackage: vi.fn(),
}));

configure({ testIdAttribute: 'data-testid' });

const WHERE_TITLE = 'agents.channels.teams.setup.availability.whereTitle';

/** Only the parts the settings block reads; the rest never runs here. */
const managedRuntime = (overrides: Record<string, unknown> = {}) =>
	({
		load: vi.fn(),
		loading: { value: false },
		managedSetup: {
			value: {
				managedSetupAvailable: true,
				managerCredentials: [{ id: 'm-1', name: 'Microsoft', connected: true }],
				adminConsentUrl: null,
			},
		},
		connectedCredentialId: ref(''),
		catalogState: ref(null),
		installed: ref(false),
		publishApp: vi.fn(),
		refreshCatalogState: vi.fn(),
		...overrides,
	}) as unknown as TeamsChannelRuntime;

const viewProps = {
	mode: 'edit' as const,
	modelValue: 'cred-1',
	integration: {
		type: 'teams',
		label: 'Microsoft Teams',
		icon: 'teams',
		credentialTypes: ['microsoftEntraServicePrincipalApi'],
	},
	credentials: [],
	credentialPermissions: { create: true },
	credentialsLoading: false,
	loading: false,
	connected: true,
	connectedDescription: '',
	errorMessage: '',
	errorIsConflict: false,
	isPublished: true,
	agentName: 'Agent',
	projectId: 'p',
	agentId: 'a',
	forceNewCredential: false,
	simpleSetup: false,
	// Enough of the runtime for the settings to decide it has no recommended
	// setup to offer, which is this view's ordinary case.
	runtime: {
		load: vi.fn(),
		loading: { value: false },
		managedSetup: {
			value: { managedSetupAvailable: false, managerCredentials: [], adminConsentUrl: null },
		},
	} as unknown as TeamsChannelRuntime,
};

// The modal only ever talks to the outer view, so this stands in for it.
const Host = defineComponent({
	components: { AgentChannelTeamsEditView },
	props: { props: { type: Object, default: () => viewProps } },
	setup() {
		const view = ref<InstanceType<typeof AgentChannelTeamsEditView>>();
		async function save() {
			await view.value?.beforeSave();
			await view.value?.afterSave();
		}
		return { view, save };
	},
	template: `
		<div>
			<AgentChannelTeamsEditView ref="view" v-bind="props" />
			<span data-testid="save-label">{{ view?.saveLabel ?? '' }}</span>
			<button data-testid="save" @click="save" />
		</div>
	`,
});

const stubs = { AgentIntegrationCredentialConnection: { template: '<div />' } };

const renderHost = createComponentRenderer(Host, { global: { stubs } });

/** Without the host, for the cases that only read what the settings render. */
const renderView = createComponentRenderer(AgentChannelTeamsEditView, { global: { stubs } });

describe('AgentChannelTeamsEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: 'https://n8n.example.com/webhooks/teams',
			botId: '11111111-2222-3333-4444-555555555555',
			deployToAzureUrl: null,
			credentialClaimedBy: null,
			provisionedByN8n: true,
			defaultDisplayName: 'Support Bot',
			defaultDescription: 'Chat with Support Bot, an agent powered by n8n.',
		});
		vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
	});

	it('passes the save label and the save hooks through to the modal', async () => {
		const { getByTestId } = renderHost();

		await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
		expect(getByTestId('save-label')).toBeEmptyDOMElement();

		await fireEvent.click(
			within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
		);
		await fireEvent.click(getByTestId('teams-scope-groups'));
		expect(getByTestId('save-label')).toHaveTextContent(
			'agents.channels.teams.settings.saveAndDownload',
		);

		await fireEvent.click(getByTestId('save'));

		await waitFor(() =>
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
				expect.objectContaining({ groupChats: true }),
			),
		);
	});

	/**
	 * Uploading the package needs no catalogue entry, so it is the only route
	 * that works through the day Microsoft can take to make a published app
	 * addable -- which is exactly when someone opens these settings.
	 */
	it('offers the package while Microsoft is not ready', async () => {
		const { getByTestId } = renderView({
			props: {
				...viewProps,
				// The package has to carry what the channel runs on, not what the
				// form is holding, or an upload ships a manifest n8n does not match.
				savedSettings: { teamChannels: true },
				runtime: managedRuntime({
					catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
				}),
			},
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-settings-download')).toBeEnabled());
		await flushPromises();

		await fireEvent.click(getByTestId('teams-settings-download'));

		await waitFor(() =>
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
				expect.objectContaining({ teamChannels: true }),
			),
		);
		// The upload is a step in Teams, so the step is said rather than assumed.
		expect(getByTestId('teams-managed-app-downloaded')).toBeVisible();
	});

	/**
	 * A managed channel updates its app by publishing again, so the save is just
	 * a save -- offering a download would hand over a package nobody uses.
	 */
	it('offers to publish rather than to download, where the app is published for you', async () => {
		const { getByTestId, queryByTestId } = renderHost({
			props: { props: { ...viewProps, runtime: managedRuntime() } },
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-managed-app')).toBeVisible());
		// The read on open shows in the action, not as a spinner beside it.
		expect(queryByTestId('teams-settings-refresh')).not.toBeInTheDocument();
		await fireEvent.click(
			within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
		);
		await fireEvent.click(getByTestId('teams-scope-groups'));

		// The package is the manual route's answer; this one's is a new version
		// in the catalogue, and the save is what carries it there.
		expect(getByTestId('save-label')).toHaveTextContent(
			'agents.channels.teams.settings.saveAndPublish',
		);
	});

	/**
	 * The managed card acts on the channel's credential: it publishes it and
	 * hands out its package. A channel someone wired up by hand is not that
	 * one, even in a project that also carries a Microsoft sign-in.
	 */
	it('leaves a hand-made channel to the manual block', async () => {
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: 'https://n8n.test/webhook',
			botId: 'bot-1',
			deployToAzureUrl: null,
			credentialClaimedBy: null,
			provisionedByN8n: false,
			defaultDisplayName: 'Support Bot',
			defaultDescription: 'An agent built with n8n.',
		});

		const { queryByTestId, getByTestId } = renderView({
			props: {
				...viewProps,
				runtime: managedRuntime({
					catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
				}),
			},
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-identity-field')).toBeVisible());
		expect(queryByTestId('teams-managed-app')).not.toBeInTheDocument();
	});

	/**
	 * A manifest change saved in n8n and absent from Teams is the state this
	 * avoids: on a managed channel the save publishes the new version, the way
	 * it hands over a new package on a manual one.
	 */
	it('publishes the new version when a managed channel is saved', async () => {
		const publishApp = vi.fn();
		const { getByTestId } = renderHost({
			props: {
				props: {
					...viewProps,
					savedSettings: { teamChannels: false },
					runtime: managedRuntime({
						catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
						publishApp,
					}),
				},
			},
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-availability')).toBeVisible());
		await fireEvent.click(
			within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
		);
		await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
		await fireEvent.click(getByTestId('teams-scope-channels'));

		await waitFor(() =>
			expect(getByTestId('save-label')).toHaveTextContent(
				'agents.channels.teams.settings.saveAndPublish',
			),
		);

		await fireEvent.click(getByTestId('save'));

		// The change itself, not just that something was published: the saved
		// settings still say `teamChannels: false`, so asserting the call alone
		// would pass on a publish of the stale version.
		await waitFor(() =>
			expect(publishApp).toHaveBeenCalledWith(expect.objectContaining({ teamChannels: true })),
		);
	});

	/**
	 * A channel wired up by hand has no app n8n can publish, so the managed card
	 * must stay away and the package must stay the whole answer.
	 */
	it('offers the package and nothing else to a hand-made channel', async () => {
		const { getByTestId, queryByTestId } = renderView({
			props: viewProps,
			pinia: createTestingPinia(),
		});

		await waitFor(() => expect(getByTestId('teams-download-package')).toBeVisible());
		expect(queryByTestId('teams-managed-app')).not.toBeInTheDocument();
		expect(queryByTestId('teams-settings-publish')).not.toBeInTheDocument();
	});
});
