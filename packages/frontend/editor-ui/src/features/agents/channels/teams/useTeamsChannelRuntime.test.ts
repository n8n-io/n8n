import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import {
	createTeamsManagerCredential,
	getTeamsAzureSubscriptions,
	getTeamsCatalogState,
	getTeamsManagedSetup,
	getTeamsSetupState,
	provisionTeamsApp,
} from './api';
import { useTeamsChannelRuntime } from './useTeamsChannelRuntime';

vi.mock('./api', () => ({
	getTeamsManagedSetup: vi.fn(),
	createTeamsManagerCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	getTeamsAzureSubscriptions: vi.fn(),
	getTeamsCatalogState: vi.fn(),
	publishTeamsApp: vi.fn(),
	provisionTeamsApp: vi.fn(),
	provisionTeamsBot: vi.fn(),
}));

const oauth = { authorize: vi.fn(), authorizeNewCredential: vi.fn() };
vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => oauth,
}));

const deleteCredential = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/credentials/credentials.store', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useCredentialsStore: () => ({
			fetchUsableCredentials: vi
				.fn()
				.mockResolvedValue([{ id: 'cred-new', type: 'microsoftTeamsManagerOAuth2Api' }]),
			deleteCredential,
		}),
	};
});

const ensureAgentPersisted = vi.fn();

const buildRuntime = () =>
	useTeamsChannelRuntime({
		projectId: ref('project-1'),
		agentId: ref('agent-1'),
		selectedCredentialId: ref(''),
		credentialModalOpen: computed(() => false),
		fetchStatus: vi.fn(),
		isConnected: () => false,
		isConfigured: () => false,
		ensureAgentPersisted,
	});

describe('useTeamsChannelRuntime', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		vi.mocked(getTeamsManagedSetup).mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [],
			adminConsentUrl: null,
		});
	});

	/**
	 * The channel modal builds a runtime for every registered platform but only
	 * calls `load()` for the catalogued ones, and it hides the whole channel list
	 * while any runtime reports loading. A runtime that starts loading therefore
	 * hangs the list for every channel, not just this one.
	 */
	it('does not report loading before anything has loaded', () => {
		expect(buildRuntime().loading.value).toBe(false);
	});

	it('reports loading only while load is in flight', async () => {
		const runtime = buildRuntime();

		const pending = runtime.load();
		expect(runtime.loading.value).toBe(true);

		await pending;
		expect(runtime.loading.value).toBe(false);
	});

	it('stops reporting loading when the setup state cannot be read', async () => {
		vi.mocked(getTeamsManagedSetup).mockRejectedValue(new Error('offline'));
		const runtime = buildRuntime();

		await runtime.load();

		expect(runtime.loading.value).toBe(false);
		// An unreachable backend falls back to the manual stepper rather than
		// leaving the setup in limbo.
		expect(runtime.managedSetup.value.managedSetupAvailable).toBe(false);
	});

	it('selects a connected sign-in so the stepper does not open on an empty picker', async () => {
		vi.mocked(getTeamsManagedSetup).mockResolvedValue({
			managedSetupAvailable: true,
			// The unconnected one first, or picking the first entry would pass too.
			managerCredentials: [
				{
					id: 'cred-0',
					name: 'Half-finished sign-in',
					connected: false,
					reconnectRequired: false,
					organizationName: null,
					tenantId: null,
				},
				{
					id: 'cred-1',
					name: 'Microsoft organization',
					connected: true,
					reconnectRequired: false,
					organizationName: 'Acme Corp',
					tenantId: 'tenant-1',
				},
			],
			adminConsentUrl: null,
		});
		const runtime = buildRuntime();

		await runtime.load();

		expect(runtime.managerCredentialId.value).toBe('cred-1');
	});

	describe('guards before a call can be made', () => {
		it('refuses to register the app before a Microsoft sign-in', async () => {
			await expect(buildRuntime().provisionApp()).rejects.toThrow(/Sign in with Microsoft/);
		});

		it('refuses to create the bot before the app exists', async () => {
			const runtime = buildRuntime();
			runtime.managerCredentialId.value = 'cred-1';

			await expect(runtime.provisionBot('sub-1')).rejects.toThrow(/Create the Teams app/);
		});
	});

	describe('connectManagerCredential', () => {
		/**
		 * `authorizeNewCredential` deletes the credential it was handed when the
		 * sign-in does not complete. Deleting it again answers 404, which turns a
		 * cancelled sign-in into an error.
		 */
		it('leaves a credential it handed to the OAuth helper for the helper to clear', async () => {
			vi.mocked(createTeamsManagerCredential).mockResolvedValue({ id: 'cred-new' } as never);
			oauth.authorizeNewCredential.mockResolvedValue(false);

			await expect(buildRuntime().connectManagerCredential()).resolves.toBe(false);

			expect(oauth.authorizeNewCredential).toHaveBeenCalled();
			expect(deleteCredential).not.toHaveBeenCalled();
		});

		/** The credential never reached the helper, so nobody else will clear it. */
		it('clears a credential the helper never saw', async () => {
			vi.mocked(createTeamsManagerCredential).mockResolvedValue({ id: 'missing' } as never);

			await expect(buildRuntime().connectManagerCredential()).rejects.toThrow(
				/could not be loaded/,
			);

			expect(deleteCredential).toHaveBeenCalledWith({ id: 'missing' });
		});

		/**
		 * The tidy-up runs in a `finally`, while the real error is on its way out.
		 * Without the catch it would take that error's place and the user would
		 * be told the delete failed rather than why the sign-in did.
		 */
		it('keeps the original error when the tidy-up fails too', async () => {
			vi.mocked(createTeamsManagerCredential).mockResolvedValue({ id: 'missing' } as never);
			// Once: the stub is module-scope and `clearAllMocks` resets calls, not
			// implementations, so a standing rejection would reach later tests.
			deleteCredential.mockRejectedValueOnce(new Error('Could not delete the credential'));

			await expect(buildRuntime().connectManagerCredential()).rejects.toThrow(
				/could not be loaded/,
			);
		});

		it('signs in an existing credential rather than making another', async () => {
			oauth.authorize.mockResolvedValue(true);

			await expect(buildRuntime().connectManagerCredential('cred-new')).resolves.toBe(true);

			expect(createTeamsManagerCredential).not.toHaveBeenCalled();
			expect(oauth.authorize).toHaveBeenCalled();
		});
	});

	describe('provisionApp', () => {
		/**
		 * A sign-in already on the project is selected on load, so registering the
		 * app can be the first button pressed -- and the backend reads the agent
		 * by id, which a draft does not have yet.
		 */
		it('persists the agent before asking the backend about it', async () => {
			vi.mocked(provisionTeamsApp).mockResolvedValue({ credentialId: 'bot-cred-1' } as never);
			vi.mocked(getTeamsSetupState).mockResolvedValue({ botId: null } as never);
			const runtime = buildRuntime();
			runtime.managerCredentialId.value = 'cred-1';

			await runtime.provisionApp();

			expect(ensureAgentPersisted).toHaveBeenCalled();
			expect(runtime.provisionedApp.value).toEqual({ credentialId: 'bot-cred-1' });
			expect(runtime.botSetupState.value).toEqual({ botId: null });
		});
	});

	/**
	 * The modal keeps one runtime while the agent and the sign-in both change,
	 * so a reply that lands late would repopulate state the view has cleared --
	 * with another tenant's values.
	 */
	describe('replies that arrive after the question changed', () => {
		it('drops subscriptions belonging to a sign-in that is no longer selected', async () => {
			const runtime = buildRuntime();
			runtime.managerCredentialId.value = 'cred-1';
			vi.mocked(getTeamsAzureSubscriptions).mockImplementation(async () => {
				runtime.managerCredentialId.value = 'cred-2';
				return [{ id: 'sub-1', name: 'Production' }];
			});

			await runtime.loadSubscriptions();

			expect(runtime.subscriptions.value).toEqual([]);
		});
	});

	/**
	 * Publishing can take a day to take effect, so reopening the setup later is
	 * the ordinary path. Until this the step only knew what it had done itself,
	 * and an app published or removed since read as whatever it last saw.
	 */
	it('reads the catalogue back when there is a sign-in to read it with', async () => {
		vi.mocked(getTeamsManagedSetup).mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'cred-1',
					name: 'Microsoft organization',
					connected: true,
					reconnectRequired: false,
					organizationName: 'Acme Corp',
					tenantId: 'tenant-1',
				},
			],
			adminConsentUrl: null,
		});
		vi.mocked(getTeamsCatalogState).mockResolvedValue({
			status: 'published',
			teamsAppId: 'teams-app-1',
		});
		const runtime = buildRuntime();

		await runtime.load();
		await flushPromises();

		expect(getTeamsCatalogState).toHaveBeenCalled();
		expect(runtime.catalogState.value).toEqual({ status: 'published', teamsAppId: 'teams-app-1' });
	});

	/**
	 * For minutes after a publish the catalogue answers "unknown" to everyone,
	 * including about an app it has just been given. Taking that as the truth
	 * sent the step back to offering a publish that had already happened, which
	 * Microsoft then refused as a duplicate.
	 */
	it('keeps a state it watched Microsoft report over a catalogue that cannot answer', async () => {
		vi.mocked(getTeamsManagedSetup).mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'cred-1',
					name: 'Microsoft organization',
					connected: true,
					reconnectRequired: false,
					organizationName: 'Acme Corp',
					tenantId: 'tenant-1',
				},
			],
			adminConsentUrl: null,
		});
		vi.mocked(getTeamsCatalogState).mockResolvedValue({ status: 'unknown', teamsAppId: null });
		const runtime = buildRuntime();
		// Through load, or there is no sign-in to read the catalogue with and
		// the read never happens.
		await runtime.load();
		runtime.catalogState.value = { status: 'published', teamsAppId: 'teams-app-1' };

		await runtime.refreshCatalogState();

		expect(runtime.catalogState.value).toEqual({ status: 'published', teamsAppId: 'teams-app-1' });
	});

	it('takes an answer the catalogue can give', async () => {
		vi.mocked(getTeamsManagedSetup).mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'cred-1',
					name: 'Microsoft organization',
					connected: true,
					reconnectRequired: false,
					organizationName: 'Acme Corp',
					tenantId: 'tenant-1',
				},
			],
			adminConsentUrl: null,
		});
		vi.mocked(getTeamsCatalogState).mockResolvedValue({ status: 'rejected', teamsAppId: 'a-1' });
		const runtime = buildRuntime();
		await runtime.load();
		runtime.catalogState.value = { status: 'published', teamsAppId: 'teams-app-1' };

		await runtime.refreshCatalogState();

		expect(runtime.catalogState.value).toEqual({ status: 'rejected', teamsAppId: 'a-1' });
	});

	it('does not ask the catalogue without a sign-in to ask with', async () => {
		const runtime = buildRuntime();

		await runtime.load();
		await flushPromises();

		expect(getTeamsCatalogState).not.toHaveBeenCalled();
	});
});
