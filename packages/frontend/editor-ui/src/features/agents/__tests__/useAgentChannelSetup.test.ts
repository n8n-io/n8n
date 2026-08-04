import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';

const {
	authorizeNewCredentialMock,
	authorizeOAuthMock,
	createSlackManagerCredentialMock,
	deleteCredentialMock,
	fetchAllCredentialsForWorkflowMock,
	fetchProjectMock,
	getSlackManagedAppSettingsMock,
	getSlackManagedSetupMock,
	installSlackManagedAppMock,
	projectsStoreMock,
	setCredentialsMock,
	updateSlackManagedAppSettingsMock,
} = vi.hoisted(() => ({
	authorizeNewCredentialMock: vi.fn(),
	authorizeOAuthMock: vi.fn(),
	createSlackManagerCredentialMock: vi.fn(),
	deleteCredentialMock: vi.fn(),
	fetchAllCredentialsForWorkflowMock: vi.fn(),
	fetchProjectMock: vi.fn(),
	getSlackManagedAppSettingsMock: vi.fn(),
	getSlackManagedSetupMock: vi.fn(),
	installSlackManagedAppMock: vi.fn(),
	projectsStoreMock: {
		currentProject: null as { id: string; scopes?: string[] } | null,
		personalProject: null as { id: string; scopes?: string[] } | null,
		myProjects: [] as Array<{ id: string; scopes?: string[] }>,
		fetchProject: vi.fn(),
	},
	setCredentialsMock: vi.fn(),
	updateSlackManagedAppSettingsMock: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	createSlackAgentApp: vi.fn().mockResolvedValue({ installUrl: 'https://slack.test/install' }),
	createSlackManagerCredential: createSlackManagerCredentialMock,
	getSlackManagedAppSettings: getSlackManagedAppSettingsMock,
	getSlackManagedSetup: getSlackManagedSetupMock,
	installSlackManagedApp: installSlackManagedAppMock,
	updateSlackManagedAppSettings: updateSlackManagedAppSettingsMock,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		isModalActiveById: {},
		openNewCredential: vi.fn(),
		openExistingCredential: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: setCredentialsMock,
		fetchAllCredentialsForWorkflow: fetchAllCredentialsForWorkflowMock,
		getCredentialTypeByName: vi.fn(),
		deleteCredential: deleteCredentialMock,
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: authorizeOAuthMock,
		authorizeNewCredential: authorizeNewCredentialMock,
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStoreMock,
}));

function createChannelSetup(connectedCredentials: Record<string, string> = {}) {
	return useAgentChannelSetup({
		projectId: () => 'artifact-project',
		agentId: () => 'agent-1',
		currentIntegration: null,
		connectedCredentials,
		fetchStatus: vi.fn().mockResolvedValue(undefined),
		isIntegrationConnected: () => false,
	});
}

describe('useAgentChannelSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		projectsStoreMock.currentProject = null;
		projectsStoreMock.personalProject = null;
		projectsStoreMock.myProjects = [];
		projectsStoreMock.fetchProject = fetchProjectMock;
		authorizeNewCredentialMock.mockResolvedValue(true);
		authorizeOAuthMock.mockResolvedValue(true);
		createSlackManagerCredentialMock.mockResolvedValue({ id: 'manager' });
		deleteCredentialMock.mockResolvedValue(true);
		getSlackManagedAppSettingsMock.mockResolvedValue({
			credentialId: 'bot',
			appId: 'A123',
			name: 'Support Bot',
			description: 'Handles support requests',
			alwaysOnline: true,
			appHomeUrl: 'https://api.slack.com/apps/A123/app-home',
		});
		updateSlackManagedAppSettingsMock.mockResolvedValue({
			credentialId: 'bot',
			appId: 'A123',
			name: 'Support Bot',
			description: 'Handles support requests',
			alwaysOnline: true,
			appHomeUrl: 'https://api.slack.com/apps/A123/app-home',
		});
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([]);
		getSlackManagedSetupMock.mockResolvedValue({
			managedSetupAvailable: false,
			managerCredentials: [],
		});
		installSlackManagedAppMock.mockResolvedValue({
			status: 'connected',
			appId: 'A123',
			credentialId: 'bot',
		});
		fetchProjectMock.mockResolvedValue({
			id: 'artifact-project',
			name: 'Artifact project',
			icon: null,
			type: 'team',
			description: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			relations: [],
			scopes: ['credential:create'],
			rolesManaged: false,
		});
	});

	it('uses project scopes already available in the store', async () => {
		projectsStoreMock.myProjects = [{ id: 'artifact-project', scopes: ['credential:create'] }];
		const { credentialPermissions, loadChannelState } = createChannelSetup();

		await loadChannelState([]);

		expect(credentialPermissions.value.create).toBe(true);
		expect(fetchProjectMock).not.toHaveBeenCalled();
	});

	it('loads scopes when an artifact project is missing from the store', async () => {
		// AGENT-443: artifact mode supplies its project through props rather than the route.
		const { credentialPermissions, loadChannelState } = createChannelSetup();

		expect(credentialPermissions.value.create).toBe(false);

		await loadChannelState([]);

		expect(fetchProjectMock).toHaveBeenCalledWith('artifact-project');
		expect(credentialPermissions.value.create).toBe(true);
	});

	it('resolves setupSlackApp successfully when the popup closes while an in-flight poll is about to confirm the connection', async () => {
		vi.useFakeTimers();

		class FakeBroadcastChannel {
			addEventListener() {}
			removeEventListener() {}
			close() {}
			postMessage() {}
		}
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

		const fakePopup = { closed: false, close: vi.fn() };
		vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window);

		let resolveFirstPoll!: () => void;
		const firstPoll = new Promise<void>((resolve) => {
			resolveFirstPoll = resolve;
		});
		let isConnected = false;
		const fetchStatus = vi.fn().mockImplementation(async () => {
			if (fetchStatus.mock.calls.length === 1) {
				await firstPoll;
			}
		});

		const onConnected = vi.fn();
		const { setupSlackApp } = useAgentChannelSetup({
			projectId: () => 'artifact-project',
			agentId: () => 'agent-1',
			currentIntegration: null,
			connectedCredentials: {},
			fetchStatus,
			isIntegrationConnected: () => isConnected,
		});

		const setupPromise = setupSlackApp('token', onConnected);
		await vi.advanceTimersByTimeAsync(0);

		fakePopup.closed = true;
		await vi.advanceTimersByTimeAsync(2000);

		isConnected = true;
		resolveFirstPoll();

		await expect(setupPromise).resolves.toBe(true);
		expect(onConnected).toHaveBeenCalled();

		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('loads managed Slack capability with the channel state', async () => {
		getSlackManagedSetupMock.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [],
		});
		const { loadChannelState, managedSlackSetup } = createChannelSetup();

		await loadChannelState([]);

		expect(managedSlackSetup.value.managedSetupAvailable).toBe(true);
		expect(getSlackManagedSetupMock).toHaveBeenCalledWith({}, 'artifact-project', 'agent-1');
	});

	it('loads managed app settings for the connected managed Slack credential', async () => {
		getSlackManagedSetupMock.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'manager',
					name: 'Slack manager',
					connected: true,
					reconnectRequired: false,
					workspaces: [
						{
							id: 'T123',
							name: 'Example workspace',
							connected: true,
							botCredentialId: 'bot',
						},
					],
				},
			],
		});
		const { loadChannelState, managedSlackAppSettings } = createChannelSetup({ slack: 'bot' });

		await loadChannelState([]);
		await vi.waitFor(() => {
			expect(managedSlackAppSettings.value?.credentialId).toBe('bot');
		});

		expect(getSlackManagedAppSettingsMock).toHaveBeenCalledWith(
			{},
			'artifact-project',
			'agent-1',
			'bot',
		);
	});

	it('updates managed Slack app settings through the agent API', async () => {
		const { saveManagedSlackAppSettings, managedSlackAppSettings } = createChannelSetup();
		const update = {
			credentialId: 'bot',
			name: 'Updated Bot',
			description: 'Updated description',
			alwaysOnline: false,
		};

		await saveManagedSlackAppSettings(update);

		expect(updateSlackManagedAppSettingsMock).toHaveBeenCalledWith(
			{},
			'artifact-project',
			'agent-1',
			update,
		);
		expect(managedSlackAppSettings.value?.name).toBe('Support Bot');
	});

	it('deletes a newly created manager credential when OAuth is cancelled', async () => {
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		]);
		authorizeNewCredentialMock.mockResolvedValue(false);
		const { connectSlackManagerCredential } = createChannelSetup();

		await expect(connectSlackManagerCredential()).resolves.toBe(false);

		expect(authorizeNewCredentialMock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'manager' }),
		);
		expect(deleteCredentialMock).not.toHaveBeenCalled();
	});

	it('deletes a newly created manager credential when OAuth fails', async () => {
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		]);
		authorizeNewCredentialMock.mockRejectedValue(new Error('OAuth failed'));
		const { connectSlackManagerCredential } = createChannelSetup();

		await expect(connectSlackManagerCredential()).rejects.toThrow('OAuth failed');

		expect(authorizeNewCredentialMock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'manager' }),
		);
		expect(deleteCredentialMock).not.toHaveBeenCalled();
	});

	it('preserves a newly created manager credential after successful OAuth', async () => {
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		]);
		const { connectSlackManagerCredential } = createChannelSetup();

		await expect(connectSlackManagerCredential()).resolves.toBe(true);

		expect(authorizeNewCredentialMock).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'manager' }),
		);
		expect(deleteCredentialMock).not.toHaveBeenCalled();
	});

	it('preserves an existing manager credential when OAuth is cancelled', async () => {
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([
			{ id: 'existing-manager', type: 'slackManagerOAuth2Api' },
		]);
		authorizeOAuthMock.mockResolvedValue(false);
		const { connectSlackManagerCredential } = createChannelSetup();

		await expect(connectSlackManagerCredential('existing-manager')).resolves.toBe(false);

		expect(createSlackManagerCredentialMock).not.toHaveBeenCalled();
		expect(deleteCredentialMock).not.toHaveBeenCalled();
	});

	it('completes the managed auto-install branch without opening a popup', async () => {
		const onConnected = vi.fn();
		const openSpy = vi.spyOn(window, 'open');
		const { installManagedSlack } = createChannelSetup();

		await expect(installManagedSlack('manager', 'T123', onConnected)).resolves.toBe(true);

		expect(installSlackManagedAppMock).toHaveBeenCalledWith(
			{},
			'artifact-project',
			'agent-1',
			'manager',
			'T123',
		);
		expect(openSpy).not.toHaveBeenCalled();
		expect(onConnected).toHaveBeenCalledOnce();
	});

	it('opens the returned OAuth URL for the managed manual-install branch', async () => {
		installSlackManagedAppMock.mockResolvedValue({
			status: 'manual_install_required',
			appId: 'A123',
			installUrl: 'https://slack.test/install-managed',
		});
		class FakeBroadcastChannel {
			addEventListener(_event: string, listener: (event: MessageEvent) => void) {
				queueMicrotask(() => listener({ data: 'success' } as MessageEvent));
			}
			removeEventListener() {}
			close() {}
		}
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
		const popup = { closed: false, close: vi.fn() };
		const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
		const onConnected = vi.fn();
		const { installManagedSlack } = createChannelSetup();

		await expect(installManagedSlack('manager', 'T123', onConnected)).resolves.toBe(true);

		expect(openSpy).toHaveBeenCalledWith(
			'https://slack.test/install-managed',
			'Slack App Authorization',
			expect.any(String),
		);
		expect(popup.close).toHaveBeenCalled();
		expect(onConnected).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});
});
