import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { computed, defineComponent, ref } from 'vue';

import AgentChannelTeamsEditView from './AgentChannelTeamsEditView.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { checkTeamsFileAccess, fetchTeamsAppPackage, getTeamsSetupState } from './api';
import { fileAccessJustApproved } from './fileAccessConsent';
import { ActionDropdownTestStub } from '../../__tests__/utils/ActionDropdownTestStub';
import { AGENT_PERSONALISATION_KEY } from '../types';

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
	checkTeamsFileAccess: vi.fn(),
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
		managerCredentialId: ref('m-1'),
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
		managerCredentialId: ref(''),
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

const stubs = {
	AgentIntegrationCredentialConnection: { template: '<div />' },
	ActionDropdown: ActionDropdownTestStub,
};

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
			fileAccessConsentUrl: null,
			azureBot: null,
			appOutdated: false,
			defaultDisplayName: 'Support Bot',
			defaultDescription: 'Chat with Support Bot, an agent powered by n8n.',
		});
		vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
		vi.mocked(checkTeamsFileAccess).mockResolvedValue({ status: 'notApproved' });
	});

	describe('file access', () => {
		it('says nothing about an approval given earlier', async () => {
			vi.mocked(checkTeamsFileAccess).mockResolvedValue({ status: 'approved' });

			const { queryByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});
			await flushPromises();

			expect(checkTeamsFileAccess).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-1');
			expect(queryByTestId('teams-file-access')).toBeNull();
			expect(queryByTestId('teams-file-access-approved')).toBeNull();
		});

		it('never shows the request for an approved app while the settings load', async () => {
			vi.mocked(checkTeamsFileAccess).mockResolvedValue({ status: 'approved' });
			const state = await getTeamsSetupState({} as never, 'p', 'a');
			let resolveSetup = () => {};
			vi.mocked(getTeamsSetupState).mockReturnValue(
				new Promise((resolve) => (resolveSetup = () => resolve(state))),
			);
			const seen: boolean[] = [];
			const { queryByTestId, rerender } = renderView({
				props: { ...viewProps, modelValue: '', savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});
			seen.push(Boolean(queryByTestId('teams-file-access')));
			// The modal hands the credential over after mount.
			await rerender({ ...viewProps, modelValue: 'cred-1', savedSettings: { teamChannels: true } });
			await flushPromises();
			seen.push(Boolean(queryByTestId('teams-file-access')));
			resolveSetup();
			await flushPromises();
			seen.push(Boolean(queryByTestId('teams-file-access')));

			expect(seen).toEqual([false, false, false]);
		});

		it('asks once the check says the approval is missing, not before the setup loads', async () => {
			const state = await getTeamsSetupState({} as never, 'p', 'a');
			let resolveSetup = () => {};
			vi.mocked(getTeamsSetupState).mockReturnValue(
				new Promise((resolve) => (resolveSetup = () => resolve(state))),
			);
			const { queryByTestId, findByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});
			await flushPromises();
			expect(queryByTestId('teams-file-access')).toBeNull();

			resolveSetup();

			expect(await findByTestId('teams-file-access')).toBeVisible();
		});

		it('asks while the approval is missing', async () => {
			const { findByTestId, queryByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});

			expect(await findByTestId('teams-file-access')).toBeVisible();
			expect(queryByTestId('teams-file-access-approved')).toBeNull();
		});

		it('shows nothing while checking', async () => {
			vi.mocked(checkTeamsFileAccess).mockReturnValue(new Promise(() => {}));

			const { queryByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});
			await flushPromises();

			expect(queryByTestId('teams-file-access')).toBeNull();
			expect(queryByTestId('teams-file-access-approved')).toBeNull();
		});

		it('confirms the approval once, when Microsoft returns from it', async () => {
			fileAccessJustApproved.value = true;

			const { findByTestId, queryByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});

			expect(await findByTestId('teams-file-access-approved')).toBeVisible();
			expect(queryByTestId('teams-file-access')).toBeNull();
			expect(checkTeamsFileAccess).not.toHaveBeenCalled();
			expect(fileAccessJustApproved.value).toBe(false);
		});

		it('checks a credential picked after the approval', async () => {
			fileAccessJustApproved.value = true;

			const { findByTestId, queryByTestId, rerender } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});
			expect(await findByTestId('teams-file-access-approved')).toBeVisible();

			await rerender({ ...viewProps, modelValue: 'cred-2', savedSettings: { teamChannels: true } });
			await flushPromises();

			expect(checkTeamsFileAccess).toHaveBeenCalledWith(expect.anything(), 'p', 'a', 'cred-2');
			expect(queryByTestId('teams-file-access-approved')).toBeNull();
			expect(await findByTestId('teams-file-access')).toBeVisible();
		});

		it('keeps the approval for when the saved settings arrive late', async () => {
			fileAccessJustApproved.value = true;

			const { rerender, findByTestId } = renderView({
				props: { ...viewProps, savedSettings: undefined },
				pinia: createTestingPinia(),
			});
			await rerender({ ...viewProps, savedSettings: { teamChannels: true } });

			expect(await findByTestId('teams-file-access-approved')).toBeVisible();
			expect(checkTeamsFileAccess).not.toHaveBeenCalled();
		});

		it('falls back to the request when the check fails', async () => {
			vi.mocked(checkTeamsFileAccess).mockRejectedValue(new Error('offline'));

			const { findByTestId } = renderView({
				props: { ...viewProps, savedSettings: { teamChannels: true } },
				pinia: createTestingPinia(),
			});

			expect(await findByTestId('teams-file-access')).toBeVisible();
		});

		it('checks nothing while the agent reads only direct messages', async () => {
			renderView({ props: viewProps, pinia: createTestingPinia() });
			await flushPromises();

			expect(checkTeamsFileAccess).not.toHaveBeenCalled();
		});
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
	});

	/**
	 * Both of the managed route's answers are buttons on the card, and one of
	 * them reaches the whole organisation. The save takes neither: it stays a
	 * save, whatever the label would otherwise have promised.
	 */
	it('keeps the save a plain save on a managed channel', async () => {
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

		// Empty, so the modal falls back to its own Save.
		expect(getByTestId('save-label')).toBeEmptyDOMElement();
		// The route is still offered, by the button that names what it does.
		expect(getByTestId('teams-settings-publish')).toBeInTheDocument();
	});

	/**
	 * The notice promises what the save does, and the two routes do opposite
	 * things with it: one hands over a file, the other reaches every person in
	 * the organisation. Naming the wrong one is the failure worth pinning.
	 */
	describe('the notice above the save', () => {
		// Every key here carries `updateNotice` as a prefix, so a substring match
		// would pass whichever one rendered. The whole text is the assertion.
		const noticeOf = (getByTestId: (id: string) => HTMLElement) =>
			getByTestId('teams-update-notice').textContent?.trim();

		const changeAvailability = async (getByTestId: (id: string) => HTMLElement) => {
			await fireEvent.click(
				within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
			);
			await fireEvent.click(getByTestId('teams-scope-groups'));
		};

		it('flags an app the agent has moved on from since it was handed over, until it is again', async () => {
			const state = await getTeamsSetupState({} as never, 'p', 'a');
			vi.mocked(getTeamsSetupState).mockResolvedValueOnce({ ...state, appOutdated: true });
			vi.mocked(getTeamsSetupState).mockResolvedValue({ ...state, appOutdated: false });

			const { getByTestId, findByTestId, queryByTestId } = renderView({
				props: { ...viewProps, runtime: managedRuntime() },
				pinia: createTestingPinia(),
			});

			expect(await findByTestId('teams-managed-app-outdated')).toBeVisible();

			await fireEvent.click(getByTestId('teams-settings-download'));

			await waitFor(() =>
				expect(queryByTestId('teams-managed-app-outdated')).not.toBeInTheDocument(),
			);
		});

		it('shows no notice on a managed channel, and flags the older version once changed', async () => {
			const { getByTestId, queryByTestId } = renderView({
				props: { ...viewProps, runtime: managedRuntime() },
				pinia: createTestingPinia(),
			});

			await waitFor(() => expect(getByTestId('teams-managed-app')).toBeVisible());
			expect(queryByTestId('teams-update-notice')).not.toBeInTheDocument();
			expect(queryByTestId('teams-managed-app-outdated')).not.toBeInTheDocument();

			await changeAvailability(getByTestId);

			expect(queryByTestId('teams-update-notice')).not.toBeInTheDocument();
			expect(getByTestId('teams-managed-app-outdated')).toBeVisible();
		});

		it('does not flag an older version when the credential arrives after mount', async () => {
			const { getByTestId, queryByTestId, rerender } = renderView({
				props: { ...viewProps, modelValue: '', runtime: managedRuntime() },
				pinia: createTestingPinia(),
			});
			await rerender({ ...viewProps, modelValue: 'cred-1', runtime: managedRuntime() });

			await waitFor(() => expect(getByTestId('teams-managed-app')).toBeVisible());
			expect(queryByTestId('teams-managed-app-outdated')).not.toBeInTheDocument();
		});

		// The manual route says the same thing throughout: the package is handed
		// over by the download, so a change here does not alter what to do next.
		it('keeps one message for a hand-made channel, changed or not', async () => {
			vi.mocked(getTeamsSetupState).mockResolvedValue({
				messagingEndpointUrl: 'https://n8n.test/webhook',
				botId: 'bot-1',
				deployToAzureUrl: null,
				credentialClaimedBy: null,
				provisionedByN8n: false,
				fileAccessConsentUrl: null,
				azureBot: null,
				appOutdated: false,
				defaultDisplayName: 'Support Bot',
				defaultDescription: 'An agent built with n8n.',
			});

			const { getByTestId } = renderView({
				props: { ...viewProps, runtime: managedRuntime() },
				pinia: createTestingPinia(),
			});

			await waitFor(() =>
				expect(noticeOf(getByTestId)).toBe('agents.channels.teams.settings.updateNotice'),
			);
			await changeAvailability(getByTestId);

			expect(noticeOf(getByTestId)).toBe('agents.channels.teams.settings.updateNotice');
		});
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
			azureBot: null,
			appOutdated: false,
			fileAccessConsentUrl: null,
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
	 * Publishing reaches every person in the organisation, or asks an
	 * administrator to approve it. A save must not do either on the user's
	 * behalf, even where the app is published already and a republish is the
	 * step they most likely want next.
	 */
	it('does not publish when a managed channel is saved', async () => {
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

		await fireEvent.click(getByTestId('save'));
		await flushPromises();

		expect(publishApp).not.toHaveBeenCalled();
	});

	/**
	 * The bug this guards: n8n built the app for both install routes, so
	 * provenance alone says nothing about whether anybody published. A channel
	 * somebody installed only for themselves must stay that way.
	 */
	it.each([
		['nothing read back yet', null],
		['an app the catalogue does not list', { status: 'unknown' as const, teamsAppId: null }],
	])('does not publish a channel n8n made but nobody published, with %s', async (_name, state) => {
		const publishApp = vi.fn();
		const { getByTestId } = renderHost({
			props: {
				props: {
					...viewProps,
					savedSettings: { teamChannels: false },
					runtime: managedRuntime({ catalogState: ref(state), publishApp }),
				},
			},
			pinia: createTestingPinia(),
		});

		// The card is right to be here -- only the save was wrong.
		await waitFor(() => expect(getByTestId('teams-managed-app')).toBeVisible());
		await fireEvent.click(
			within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
		);
		await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
		await fireEvent.click(getByTestId('teams-scope-channels'));

		expect(getByTestId('save-label')).toBeEmptyDOMElement();

		await fireEvent.click(getByTestId('save'));
		await flushPromises();

		expect(publishApp).not.toHaveBeenCalled();
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

	it("shows the agent's own icon on the identity card", async () => {
		const personalisation = computed(() => ({
			icon: 'heart',
			gradient: { from: '#2563EB', to: '#7C3AED', angle: 135, fromStop: 0, toStop: 100 },
		}));
		const { container, getByTestId } = renderHost({
			global: { provide: { [AGENT_PERSONALISATION_KEY]: personalisation } },
		});

		await waitFor(() => expect(getByTestId('teams-identity')).toBeInTheDocument());
		const tile = container.querySelector<HTMLElement>(
			'[data-test-id="agent-personalisation-icon-tile"]',
		);
		expect(tile?.style.getPropertyValue('--agent-personalisation-gradient-from')).toBe('#2563EB');
	});
});
