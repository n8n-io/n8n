import { createComponentRenderer } from '@/__tests__/render';
import type { TeamsCatalogState } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { fetchTeamsAppPackage } from './api';
import AgentChannelTeamsManagedApp from './AgentChannelTeamsManagedApp.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { ActionDropdownTestStub } from '../../__tests__/utils/ActionDropdownTestStub';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./api', () => ({
	fetchTeamsAppPackage: vi.fn().mockResolvedValue(new Blob()),
}));

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelTeamsManagedApp);

const buildRuntime = (overrides: Partial<TeamsChannelRuntime> = {}): TeamsChannelRuntime =>
	({
		managedSetup: ref({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		}),
		setupKind: ref('managed'),
		managerCredentialId: ref('manager-1'),
		loading: computed(() => false),
		load: vi.fn(),
		connectManagerCredential: vi.fn(),
		editManagerCredential: vi.fn(),
		provisionedApp: ref(null),
		botSetupState: ref(null),
		provisionedBot: ref(null),
		subscriptions: ref([]),
		catalogState: ref<TeamsCatalogState | null>(null),
		connectedCredentialId: ref(''),
		installed: ref(false),
		provisionApp: vi.fn(),
		loadSubscriptions: vi.fn(),
		provisionBot: vi.fn(),
		publishApp: vi.fn().mockResolvedValue(true),
		refreshCatalogState: vi.fn(),
		checkInstalled: vi.fn().mockResolvedValue(false),
		...overrides,
	}) as unknown as TeamsChannelRuntime;

const render = (overrides: Record<string, unknown> = {}) => {
	const { runtime, ...rest } = overrides as { runtime?: TeamsChannelRuntime };
	return renderComponent({
		props: {
			runtime: runtime ?? buildRuntime(),
			name: 'Support Bot',
			description: 'Answers support questions',
			credentialId: 'bot-cred-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			...rest,
		},
		pinia: createTestingPinia(),
		global: {
			stubs: {
				ActionDropdown: ActionDropdownTestStub,
			},
		},
	});
};

describe('AgentChannelTeamsManagedApp', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Every call the card makes acts on the app that credential stands for. */
	it('hands the channel credential to the runtime before reading anything', async () => {
		const runtime = buildRuntime();
		// Captured inside the read: asserting the ref afterwards passes even if
		// the read went out before the credential was assigned.
		let credentialAtRead: string | undefined;
		runtime.refreshCatalogState = vi.fn(async () => {
			credentialAtRead = runtime.connectedCredentialId.value;
		});

		render({ runtime });

		await waitFor(() => expect(runtime.refreshCatalogState).toHaveBeenCalled());
		expect(credentialAtRead).toBe('bot-cred-1');
	});

	it('says where the app stands once the catalogue answers', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'submitted', teamsAppId: 'teams-app-1' }),
		});

		const { getByTestId } = render({ runtime });

		await waitFor(() =>
			expect(getByTestId('teams-managed-app-standing')).toHaveTextContent(
				'agents.channels.teams.managed.app.submitted',
			),
		);
	});

	/** A review is the one state that cannot take another submission. */
	it('offers no publish while a review is pending', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'submitted', teamsAppId: 'teams-app-1' }),
		});

		const { queryByTestId } = render({ runtime });

		await waitFor(() => expect(queryByTestId('teams-settings-publish')).not.toBeInTheDocument());
	});

	it('publishes again, because that is how a changed manifest reaches the catalogue', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const settings = { availableIn: 'personal' } as never;

		const { getByTestId } = render({ runtime, settings });

		// The card reads the catalogue on mount, and holds the action until it has.
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() => expect(runtime.publishApp).toHaveBeenCalledWith(settings));
	});

	/**
	 * The save in the footer closes the dialog, so waiting for it would take the
	 * user away from the card. Publishing saves the open change itself, and the
	 * button stays available to say so.
	 */
	it('saves an unsaved change before it publishes', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const persistChannel = vi.fn().mockResolvedValue(true);

		const { getByTestId } = render({ runtime, unsavedChanges: true, persistChannel });

		await waitFor(() =>
			expect(getByTestId('teams-settings-publish')).not.toHaveAttribute('disabled'),
		);
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() => expect(runtime.publishApp).toHaveBeenCalled());
		// Saved first: the catalogue must never hold a version n8n does not.
		expect(persistChannel.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(runtime.publishApp).mock.invocationCallOrder[0],
		);
	});

	/**
	 * The form can move while the save is away. Publishing what the form held
	 * when the button was pressed keeps the catalogue at or behind n8n; reading
	 * it afterwards could put an unsaved edit in the organisation's catalogue.
	 */
	it('publishes what the form held when the save started', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const { rerender, getByTestId } = render({
			runtime,
			unsavedChanges: true,
			pendingSettings: { teamChannels: true },
			persistChannel: vi.fn().mockResolvedValue(true),
		});

		await waitFor(() =>
			expect(getByTestId('teams-settings-publish')).not.toHaveAttribute('disabled'),
		);
		const publishing = fireEvent.click(getByTestId('teams-settings-publish'));
		// The user keeps editing while the save is in flight.
		await rerender({ pendingSettings: { teamChannels: true, groupChats: true } });
		await publishing;

		await waitFor(() => expect(runtime.publishApp).toHaveBeenCalledWith({ teamChannels: true }));
	});

	// The package is what the channel runs on, so an open edit is not in it.
	it('builds the package from the saved settings, not an open edit', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const { getByTestId } = render({
			runtime,
			unsavedChanges: true,
			settings: { teamChannels: false },
			pendingSettings: { teamChannels: true },
		});

		await waitFor(() =>
			expect(getByTestId('teams-settings-download')).not.toHaveAttribute('disabled'),
		);
		await fireEvent.click(getByTestId('teams-settings-download'));

		await waitFor(() =>
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'bot-cred-1',
				{ teamChannels: false },
			),
		);
	});

	/**
	 * A publish that landed on top of a failed save would put the catalogue
	 * ahead of n8n, which is worse than leaving it behind.
	 */
	it('publishes nothing when the save it depends on fails', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const persistChannel = vi.fn().mockResolvedValue(false);

		const { getByTestId } = render({ runtime, unsavedChanges: true, persistChannel });

		await waitFor(() =>
			expect(getByTestId('teams-settings-publish')).not.toHaveAttribute('disabled'),
		);
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() => expect(persistChannel).toHaveBeenCalled());
		expect(runtime.publishApp).not.toHaveBeenCalled();
	});

	// A clean form has nothing to save, so the publish goes straight out.
	it('publishes a saved channel without saving again', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});
		const persistChannel = vi.fn().mockResolvedValue(true);

		const { getByTestId } = render({ runtime, unsavedChanges: false, persistChannel });

		await waitFor(() =>
			expect(getByTestId('teams-settings-publish')).not.toHaveAttribute('disabled'),
		);
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() => expect(runtime.publishApp).toHaveBeenCalled());
		expect(persistChannel).not.toHaveBeenCalled();
	});

	/**
	 * A read that never answers must not take the action away with it: the
	 * publish is the whole point of the card.
	 */
	it('still offers a publish when the catalogue could not be read', async () => {
		const runtime = buildRuntime({
			refreshCatalogState: vi.fn().mockRejectedValue(new Error('Graph refused the read')),
		});

		const { getByTestId } = render({ runtime });

		await waitFor(() =>
			expect(getByTestId('teams-managed-app-error')).toHaveTextContent('Graph refused the read'),
		);
		expect(getByTestId('teams-settings-publish')).toBeVisible();
	});

	/**
	 * Uploading the package is the only route that works through the day
	 * Microsoft can take to make a published app addable.
	 */
	it('offers the package whatever the catalogue says', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'submitted', teamsAppId: 'teams-app-1' }),
		});

		const { getByTestId } = render({ runtime });

		await waitFor(() => expect(getByTestId('teams-settings-download')).toBeVisible());
	});

	it('says nothing when the publish was overtaken by a change of sign-in', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
			publishApp: vi.fn().mockResolvedValue(false),
		});

		const { getByTestId } = render({ runtime });
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() => expect(runtime.publishApp).toHaveBeenCalled());
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('does not claim a publish that Microsoft has not listed yet', async () => {
		const runtime = buildRuntime({
			catalogState: ref<TeamsCatalogState | null>(null),
		});
		runtime.publishApp = vi.fn(async () => {
			runtime.catalogState.value = { status: 'unknown', teamsAppId: null };
			return true;
		});

		const { getByTestId } = render({ runtime });
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'info',
					title: 'agents.channels.teams.managed.install.unknown',
				}),
			),
		);
	});

	it('confirms a download in a toast', async () => {
		const { getByTestId, emitted } = render();
		await fireEvent.click(getByTestId('teams-settings-download'));

		await waitFor(() => expect(emitted()).toHaveProperty('installed'));

		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'agents.channels.teams.setup.install.downloaded' }),
			),
		);
	});

	it('confirms a publish in a toast', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});

		const { getByTestId } = render({ runtime });
		await fireEvent.click(getByTestId('teams-settings-publish'));

		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'agents.channels.teams.managed.install.publishedToast',
				}),
			),
		);
	});

	it('says when Teams holds an older version', async () => {
		const { getByTestId, queryByTestId, rerender } = render({ outdated: false });
		expect(queryByTestId('teams-managed-app-outdated')).not.toBeInTheDocument();

		await rerender({ outdated: true });

		expect(getByTestId('teams-managed-app-outdated')).toBeVisible();
	});

	it('links the Azure Bot the setup made', () => {
		const { getByTestId } = render({
			azureBot: { name: 'support-bot-1', portalUrl: 'https://portal.azure.com/#@t/resource/x' },
		});

		expect(getByTestId('teams-managed-app-bot')).toHaveTextContent(
			'agents.channels.teams.settings.linkedBot agents.channels.teams.settings.findInAzure',
		);
		expect(getByTestId('teams-managed-app-bot-link')).toHaveAttribute(
			'href',
			'https://portal.azure.com/#@t/resource/x',
		);
	});

	it('falls back to the bot list when the bot was not kept', () => {
		const { getByTestId } = render({ azureBot: null });

		expect(getByTestId('teams-managed-app-bot-link').getAttribute('href')).toContain(
			'BotService%2FbotServices',
		);
	});
});
