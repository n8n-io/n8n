import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';

const {
	fetchAllCredentialsForWorkflowMock,
	fetchProjectMock,
	projectsStoreMock,
	setCredentialsMock,
} = vi.hoisted(() => ({
	fetchAllCredentialsForWorkflowMock: vi.fn(),
	fetchProjectMock: vi.fn(),
	projectsStoreMock: {
		currentProject: null as { id: string; scopes?: string[] } | null,
		personalProject: null as { id: string; scopes?: string[] } | null,
		myProjects: [] as Array<{ id: string; scopes?: string[] }>,
		fetchProject: vi.fn(),
	},
	setCredentialsMock: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	createSlackAgentApp: vi.fn().mockResolvedValue({ installUrl: 'https://slack.test/install' }),
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
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStoreMock,
}));

function createChannelSetup() {
	return useAgentChannelSetup({
		projectId: () => 'artifact-project',
		agentId: () => 'agent-1',
		currentIntegration: null,
		connectedCredentials: {},
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
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([]);
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
});
