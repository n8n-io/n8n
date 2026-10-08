import { createComponentRenderer } from '@/__tests__/render';
import type { TeamsCatalogState } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import AgentChannelTeamsManagedApp from './AgentChannelTeamsManagedApp.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./api', () => ({
	fetchTeamsAppPackage: vi.fn().mockResolvedValue(new Blob()),
}));

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
		publishApp: vi.fn(),
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
	 * The card publishes the saved settings, so an unsaved change would go to
	 * the catalogue as the old version. Saving is the route that carries it.
	 */
	it('leaves publishing to the save while the form holds an unsaved change', async () => {
		const runtime = buildRuntime({
			catalogState: ref({ status: 'published', teamsAppId: 'teams-app-1' }),
		});

		const { getByTestId } = render({ runtime, unsavedChanges: true });

		await waitFor(() =>
			expect(getByTestId('teams-settings-download')).not.toHaveAttribute('disabled'),
		);
		expect(getByTestId('teams-settings-publish')).toHaveAttribute('disabled');
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
			expect(getByTestId('teams-managed-app-standing')).toHaveTextContent(
				'agents.channels.teams.managed.app.unknown',
			),
		);
		expect(getByTestId('teams-settings-publish')).not.toHaveAttribute('disabled');
		expect(getByTestId('teams-managed-app-error')).toHaveTextContent('Graph refused the read');
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
});
