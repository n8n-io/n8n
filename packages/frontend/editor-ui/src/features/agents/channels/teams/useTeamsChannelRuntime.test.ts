import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { getTeamsManagedSetup } from './api';
import { useTeamsChannelRuntime } from './useTeamsChannelRuntime';

vi.mock('./api', () => ({
	getTeamsManagedSetup: vi.fn(),
	createTeamsManagerCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	getTeamsAzureSubscriptions: vi.fn(),
	checkTeamsAppInstalled: vi.fn(),
	provisionTeamsApp: vi.fn(),
	provisionTeamsBot: vi.fn(),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({ authorize: vi.fn(), authorizeNewCredential: vi.fn() }),
}));

const buildRuntime = () =>
	useTeamsChannelRuntime({
		projectId: ref('project-1'),
		agentId: ref('agent-1'),
		selectedCredentialId: ref(''),
		credentialModalOpen: computed(() => false),
		fetchStatus: vi.fn(),
		isConnected: () => false,
		isConfigured: () => false,
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
		const runtime = buildRuntime();

		await runtime.load();

		expect(runtime.managerCredentialId.value).toBe('cred-1');
	});
});
