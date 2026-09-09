import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';

const { fetchCredentials, fetchProject, projectsStore } = vi.hoisted(() => ({
	fetchCredentials: vi.fn(),
	fetchProject: vi.fn(),
	projectsStore: {
		currentProject: null as { id: string; scopes?: string[] } | null,
		personalProject: null as { id: string; scopes?: string[] } | null,
		myProjects: [] as Array<{ id: string; scopes?: string[] }>,
		fetchProject: vi.fn(),
	},
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: (scopes?: string[]) => ({
		credential: { create: scopes?.includes('credential:create') ?? false },
	}),
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
		setCredentials: vi.fn(),
		fetchUsableCredentials: fetchCredentials,
		getCredentialTypeByName: vi.fn(),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStore,
}));

const integrations = [
	{
		type: 'example',
		label: 'Example',
		icon: 'zap',
		credentialTypes: ['exampleApi'],
	},
];

describe('useAgentChannelSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		projectsStore.currentProject = null;
		projectsStore.personalProject = null;
		projectsStore.myProjects = [];
		projectsStore.fetchProject = fetchProject;
		fetchProject.mockResolvedValue({
			id: 'project-1',
			scopes: ['credential:create'],
		});
		fetchCredentials.mockResolvedValue([
			{ id: 'credential-1', name: 'Example credential', type: 'exampleApi' },
			{ id: 'other', name: 'Other credential', type: 'otherApi' },
		]);
	});

	it('loads project permissions, integration credentials, and status generically', async () => {
		const fetchStatus = vi.fn().mockResolvedValue(undefined);
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({ example: 'credential-1' }),
			fetchStatus,
		});

		await setup.loadChannelState(integrations);

		expect(fetchProject).toHaveBeenCalledWith('project-1');
		expect(fetchStatus).toHaveBeenCalledWith(['example']);
		expect(setup.credentialPermissions.value.create).toBe(true);
		expect(setup.getCredentials('example')).toEqual([
			expect.objectContaining({ id: 'credential-1', name: 'Example credential' }),
		]);
		expect(setup.selectedCredentials.value.example).toBe('credential-1');
	});

	it('uses project scopes already available in the store', async () => {
		projectsStore.myProjects = [{ id: 'project-1', scopes: ['credential:create'] }];
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		await setup.loadChannelState(integrations);

		expect(setup.credentialPermissions.value.create).toBe(true);
		expect(fetchProject).not.toHaveBeenCalled();
	});

	it('fails closed when credentials and project permissions cannot load', async () => {
		fetchProject.mockRejectedValue(new Error('unavailable'));
		fetchCredentials.mockRejectedValue(new Error('unavailable'));
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		await setup.loadChannelState(integrations);

		expect(setup.credentialPermissions.value.create).toBe(false);
		expect(setup.getCredentials('example')).toEqual([]);
	});
});
