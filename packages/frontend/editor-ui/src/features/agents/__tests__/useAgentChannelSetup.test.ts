import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentChannelSetup } from '../composables/useAgentChannelSetup';

const {
	fetchCredentials,
	fetchCredentialTypes,
	credentialTypes,
	fetchProject,
	openNewCredential,
	projectsStore,
} = vi.hoisted(() => ({
	fetchCredentials: vi.fn(),
	fetchCredentialTypes: vi.fn(),
	credentialTypes: new Map<string, { displayName: string }>(),
	fetchProject: vi.fn(),
	openNewCredential: vi.fn(),
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
		openNewCredential,
		openExistingCredential: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchUsableCredentials: fetchCredentials,
		fetchCredentialTypes,
		getCredentialTypeByName: (name: string) => credentialTypes.get(name),
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
		credentialTypes.clear();
		fetchCredentialTypes.mockResolvedValue(undefined);
	});

	it('sets the type label when the credential types arrive after the credentials', async () => {
		const { promise, resolve } = Promise.withResolvers<void>();
		fetchCredentialTypes.mockReturnValueOnce(promise);
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		const loading = setup.loadChannelState(integrations);
		await Promise.resolve();
		credentialTypes.set('exampleApi', { displayName: 'Example API' });
		resolve();
		await loading;

		expect(fetchCredentialTypes).toHaveBeenCalledWith(false);
		expect(setup.getCredentials('example')).toEqual([
			expect.objectContaining({ id: 'credential-1', typeDisplayName: 'Example API' }),
		]);
	});

	it('retries the credential types on the next fetch after a failed load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchCredentialTypes.mockRejectedValueOnce(new Error('unavailable'));
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		await setup.loadChannelState(integrations);
		credentialTypes.set('exampleApi', { displayName: 'Example API' });
		await setup.loadChannelState(integrations);

		expect(fetchCredentialTypes).toHaveBeenCalledTimes(2);
		expect(setup.getCredentials('example')).toEqual([
			expect.objectContaining({ id: 'credential-1', typeDisplayName: 'Example API' }),
		]);
	});

	it('lists the credentials without type labels when the credential types fail to load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchCredentialTypes.mockRejectedValueOnce(new Error('unavailable'));
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => integrations[0],
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		await setup.loadChannelState(integrations);

		expect(setup.getCredentials('example')).toEqual([
			expect.objectContaining({ id: 'credential-1', typeDisplayName: undefined }),
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
		expect(fetchCredentials).toHaveBeenCalledWith({ projectId: 'project-1', forAgent: true });
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

	it('creates the requested credential type when the channel accepts several', () => {
		const setup = useAgentChannelSetup({
			projectId: () => 'project-1',
			currentIntegration: () => ({
				type: 'webhook',
				label: 'Webhook',
				icon: 'webhook',
				credentialTypes: ['httpHeaderAuth', 'jwtAuth'],
			}),
			connectedCredentials: () => ({}),
			fetchStatus: vi.fn().mockResolvedValue(undefined),
		});

		setup.createCredential('jwtAuth');

		expect(openNewCredential).toHaveBeenCalledTimes(1);
		expect(openNewCredential.mock.calls[0][0]).toBe('jwtAuth');
	});
});
