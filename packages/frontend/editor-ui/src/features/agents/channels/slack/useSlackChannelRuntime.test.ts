import { flushPromises } from '@vue/test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSlackChannelRuntime } from './useSlackChannelRuntime';

const mocks = vi.hoisted(() => ({
	getSetup: vi.fn(),
	getSettings: vi.fn(),
	updateSettings: vi.fn(),
	install: vi.fn(),
	fetchCredentials: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {}, urlBaseEditor: 'https://n8n.test' }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openExistingCredential: vi.fn() }),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchAllCredentialsForWorkflow: mocks.fetchCredentials,
		deleteCredential: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: vi.fn(),
		authorizeNewCredential: vi.fn(),
	}),
}));

vi.mock('./api', async (importOriginal) => ({
	...(await importOriginal<typeof import('./api')>()),
	createSlackAgentApp: vi.fn(),
	createSlackManagerCredential: vi.fn(),
	getSlackManagedSetup: mocks.getSetup,
	getSlackManagedAppSettings: mocks.getSettings,
	updateSlackManagedAppSettings: mocks.updateSettings,
	installSlackManagedApp: mocks.install,
}));

function createRuntime(
	selectedCredentialId = '',
	credentialModalOpen = ref(false),
	ensureAgentPersisted = vi.fn().mockResolvedValue(undefined),
) {
	return useSlackChannelRuntime({
		projectId: ref('project-1'),
		agentId: ref('agent-1'),
		selectedCredentialId: ref(selectedCredentialId),
		credentialModalOpen,
		fetchStatus: vi.fn().mockResolvedValue(undefined),
		isConnected: () => false,
		isConfigured: () => false,
		ensureAgentPersisted,
	});
}

describe('useSlackChannelRuntime', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSetup.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'manager',
					name: 'Manager',
					connected: true,
					reconnectRequired: false,
					workspaces: [{ id: 'T1', name: 'Workspace', botCredentialId: 'bot' }],
				},
			],
		});
		mocks.getSettings.mockResolvedValue({
			credentialId: 'bot',
			appId: 'A1',
			name: 'Bot',
			description: 'Description',
			alwaysOnline: true,
			appHomeUrl: 'https://api.slack.com/apps/A1/app-home',
		});
		mocks.updateSettings.mockResolvedValue({
			credentialId: 'bot',
			appId: 'A1',
			name: 'Updated',
			description: 'Updated description',
			alwaysOnline: false,
			appHomeUrl: 'https://api.slack.com/apps/A1/app-home',
		});
		mocks.install.mockResolvedValue({
			status: 'connected',
			appId: 'A1',
			credentialId: 'bot',
		});
	});

	it('loads managed setup and settings for the selected managed credential', async () => {
		const runtime = createRuntime('bot');

		await runtime.load();

		expect(runtime.setup.value.managedSetupAvailable).toBe(true);
		expect(runtime.settings.value?.credentialId).toBe('bot');
		expect(runtime.isManagedCredential('bot')).toBe(true);
	});

	it('saves managed app settings locally through the Slack API', async () => {
		const runtime = createRuntime('bot');
		const settings = {
			credentialId: 'bot',
			name: 'Updated',
			description: 'Updated description',
			alwaysOnline: false,
		};

		await runtime.saveSettings(settings);

		expect(mocks.updateSettings).toHaveBeenCalledWith({}, 'project-1', 'agent-1', settings);
		expect(runtime.settings.value?.name).toBe('Updated');
	});

	it('keeps settings valid so a failed save can be retried', async () => {
		const runtime = createRuntime('bot');
		const settings = {
			credentialId: 'bot',
			name: 'Updated',
			description: 'Updated description',
			alwaysOnline: false,
		};
		mocks.updateSettings.mockRejectedValueOnce(new Error('Slack unavailable'));

		await expect(runtime.saveSettings(settings)).rejects.toThrow('Slack unavailable');

		expect(runtime.settingsLoading.value).toBe(false);
		expect(runtime.settingsError.value).toBe(false);
		expect(runtime.settingsSaveError.value).toBeNull();
	});

	it('exposes Slack service limit errors returned when saving', async () => {
		const runtime = createRuntime('bot');
		mocks.updateSettings.mockRejectedValueOnce(
			new ResponseError('Slack could not update the Slack app: service_limits_exceeded', {
				httpStatusCode: 400,
				meta: {
					integrationType: 'slack',
					code: 'service_limits_exceeded',
				},
			}),
		);

		await expect(
			runtime.saveSettings({
				credentialId: 'bot',
				name: 'Updated',
				description: 'Updated description',
				alwaysOnline: false,
			}),
		).rejects.toThrow('service_limits_exceeded');

		expect(runtime.settingsSaveError.value).toBe('service_limits_exceeded');
	});

	it('completes managed installation and refreshes Slack state', async () => {
		const onConnected = vi.fn();
		const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
		const runtime = createRuntime('', ref(false), ensureAgentPersisted);

		await runtime.installManagedApp('manager', 'T1', onConnected);

		expect(ensureAgentPersisted).toHaveBeenCalledOnce();
		expect(mocks.install).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'manager', 'T1');
		expect(ensureAgentPersisted.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.install.mock.invocationCallOrder[0],
		);
		expect(mocks.getSetup).toHaveBeenCalled();
		expect(onConnected).toHaveBeenCalledOnce();
	});

	it('refreshes managed setup after the credential modal closes', async () => {
		const credentialModalOpen = ref(false);
		const runtime = createRuntime('', credentialModalOpen);
		await runtime.load();
		mocks.getSetup.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [],
		});

		credentialModalOpen.value = true;
		await flushPromises();
		credentialModalOpen.value = false;
		await flushPromises();

		expect(runtime.setup.value.managerCredentials).toEqual([]);
	});
});
