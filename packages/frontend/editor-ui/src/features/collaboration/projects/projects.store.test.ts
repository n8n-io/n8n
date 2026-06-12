import { setActivePinia, createPinia } from 'pinia';
import { reactive } from 'vue';
import { vi } from 'vitest';
import { useProjectsStore } from './projects.store';
import * as projectsApi from './projects.api';
import type { Project, ProjectListItem, ProjectType } from './projects.types';
import { ProjectTypes } from './projects.types';
import type { ProjectRole, Scope } from '@n8n/permissions';

type MockRoute = {
	params: Record<string, string>;
	query: Record<string, string>;
	path: string;
};

// Minimal router mock to satisfy useRoute usage in the store
const { mockRoute } = vi.hoisted(() => ({
	mockRoute: { params: {}, query: {}, path: '' } as MockRoute,
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => reactive(mockRoute),
}));

vi.mock('./projects.api', () => ({
	updateProject: vi.fn(),
	getProject: vi.fn(),
	addProjectMembers: vi.fn(),
	updateProjectMemberRole: vi.fn(),
	deleteProjectMember: vi.fn(),
}));

// Typed mocked facade for the API module
const mockedProjectsApi = vi.mocked(projectsApi);

describe('useProjectsStore.updateProject (partial payloads)', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	const makeStoreWithProject = () => {
		const store = useProjectsStore();
		// Seed myProjects and currentProject with proper typings
		const now = new Date().toISOString();
		const listItem: ProjectListItem = {
			id: 'p1',
			name: 'A',
			description: 'desc',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			role: 'project:admin' as ProjectRole,
			scopes: [] as Scope[],
		};
		store.myProjects = [listItem];

		const project: Project = {
			id: 'p1',
			name: 'A',
			description: 'desc',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			relations: [
				{ id: 'u1', email: 'x@y.z', firstName: 'X', lastName: 'Y', role: 'project:editor' },
			],
			scopes: ['project:read' as Scope],
		};
		store.currentProject = project;
		return store;
	};

	it('updates name only when provided', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);

		await store.updateProject('p1', { name: 'B' });

		expect(mockedProjectsApi.updateProject).toHaveBeenCalledWith(expect.anything(), 'p1', {
			name: 'B',
		});
		expect(store.myProjects[0].name).toBe('B');
		expect(store.myProjects[0].description).toBe('desc');
		expect(store.currentProject?.name).toBe('B');
		expect(store.currentProject?.description).toBe('desc');
		// No relations refetch
		expect(mockedProjectsApi.getProject).not.toHaveBeenCalled();
	});

	it('includes customTelemetryTags in payload and updates currentProject when provided', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);
		const tags = [{ key: 'env', value: 'production' }];

		await store.updateProject('p1', { customTelemetryTags: tags });

		expect(mockedProjectsApi.updateProject).toHaveBeenCalledWith(expect.anything(), 'p1', {
			customTelemetryTags: tags,
		});
		expect(store.currentProject?.customTelemetryTags).toEqual(tags);
	});

	it('updates icon in myProjects and currentProject when provided', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);
		const newIcon = { type: 'emoji' as const, value: '🚀' };

		await store.updateProject('p1', { icon: newIcon });

		expect(store.myProjects[0].icon).toEqual(newIcon);
		expect(store.currentProject?.icon).toEqual(newIcon);
	});

	it('omits customTelemetryTags from payload when not provided', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);

		await store.updateProject('p1', { name: 'B' });

		expect(mockedProjectsApi.updateProject).toHaveBeenCalledWith(expect.anything(), 'p1', {
			name: 'B',
		});
		expect(mockedProjectsApi.updateProject).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ customTelemetryTags: expect.anything() }),
		);
	});

	it('updates description only when provided', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);

		await store.updateProject('p1', { description: 'new-desc' });

		expect(mockedProjectsApi.updateProject).toHaveBeenCalledWith(expect.anything(), 'p1', {
			description: 'new-desc',
		});
		expect(store.myProjects[0].description).toBe('new-desc');
		expect(store.myProjects[0].name).toBe('A');
		expect(store.currentProject?.description).toBe('new-desc');
		expect(store.currentProject?.name).toBe('A');
		expect(mockedProjectsApi.getProject).not.toHaveBeenCalled();
	});

	it('addMember calls API and refreshes current project', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.addProjectMembers.mockResolvedValue(undefined);
		const now = new Date().toISOString();
		const serverProject: Project = {
			id: 'p1',
			name: 'A',
			description: 'desc',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			relations: [
				{ id: 'u1', email: 'x@y.z', firstName: 'X', lastName: 'Y', role: 'project:editor' },
				{ id: 'u2', email: 'a@b.c', firstName: 'A', lastName: 'B', role: 'project:viewer' },
			],
			scopes: ['project:read' as Scope],
		};
		mockedProjectsApi.getProject.mockResolvedValue(serverProject);

		await store.addMember('p1', { userId: 'u2', role: 'project:viewer' });
		expect(mockedProjectsApi.addProjectMembers).toHaveBeenCalledWith(expect.anything(), 'p1', [
			{ userId: 'u2', role: 'project:viewer' },
		]);
		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'p1');
		expect(store.currentProject?.relations.length).toBe(2);
	});

	it('updateMemberRole calls API and refreshes current project', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProjectMemberRole.mockResolvedValue(undefined);
		const now = new Date().toISOString();
		const serverProject: Project = {
			id: 'p1',
			name: 'A',
			description: 'desc',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			relations: [
				{ id: 'u1', email: 'x@y.z', firstName: 'X', lastName: 'Y', role: 'project:viewer' },
			],
			scopes: ['project:read' as Scope],
		};
		mockedProjectsApi.getProject.mockResolvedValue(serverProject);

		await store.updateMemberRole('p1', 'u1', 'project:viewer');
		expect(mockedProjectsApi.updateProjectMemberRole).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'u1',
			'project:viewer',
		);
		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'p1');
	});

	it('removeMember calls API and refreshes current project', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.deleteProjectMember.mockResolvedValue(undefined);
		const now = new Date().toISOString();
		const serverProject: Project = {
			id: 'p1',
			name: 'A',
			description: 'desc',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			relations: [],
			scopes: ['project:read' as Scope],
		};
		mockedProjectsApi.getProject.mockResolvedValue(serverProject);

		await store.removeMember('p1', 'u1');
		expect(mockedProjectsApi.deleteProjectMember).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'u1',
		);
		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'p1');
		expect(store.currentProject?.relations.length).toBe(0);
	});
});

describe('useProjectsStore.setProjectNavActiveIdByWorkflowHomeProject', () => {
	const route = reactive(mockRoute);

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		route.params = {};
		route.query = {};
		route.path = '';
	});

	const now = new Date().toISOString();
	const makeProject = (id: string, type: ProjectType = ProjectTypes.Team): Project => ({
		id,
		name: `Project ${id}`,
		description: null,
		icon: { type: 'icon', value: 'layers' },
		type,
		createdAt: now,
		updatedAt: now,
		relations: [],
		scopes: [] as Scope[],
	});

	const makeStore = () => {
		const store = useProjectsStore();
		store.personalProject = makeProject('personal-1', ProjectTypes.Personal);
		return store;
	};

	it('fetches the workflow home project when none is loaded', async () => {
		const store = makeStore();
		const teamProject = makeProject('team-1');
		mockedProjectsApi.getProject.mockResolvedValue(teamProject);

		await store.setProjectNavActiveIdByWorkflowHomeProject(teamProject);

		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'team-1');
		expect(store.currentProject?.id).toBe('team-1');
		expect(store.projectNavActiveId).toBe('team-1');
	});

	it('fetches the workflow home project even when the route has a projectId query param', async () => {
		route.query = { projectId: 'team-1' };
		const store = makeStore();
		const teamProject = makeProject('team-1');
		mockedProjectsApi.getProject.mockResolvedValue(teamProject);

		await store.setProjectNavActiveIdByWorkflowHomeProject(teamProject);

		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'team-1');
		expect(store.currentProject?.id).toBe('team-1');
	});

	it('replaces a previously loaded project that does not match the workflow home project', async () => {
		const store = makeStore();
		store.currentProject = makeProject('team-2');
		const teamProject = makeProject('team-1');
		mockedProjectsApi.getProject.mockResolvedValue(teamProject);

		await store.setProjectNavActiveIdByWorkflowHomeProject(teamProject);

		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'team-1');
		expect(store.currentProject?.id).toBe('team-1');
	});

	it('does not refetch when the workflow home project is already loaded', async () => {
		const store = makeStore();
		store.currentProject = makeProject('team-1');

		await store.setProjectNavActiveIdByWorkflowHomeProject(makeProject('team-1'));

		expect(mockedProjectsApi.getProject).not.toHaveBeenCalled();
		expect(store.currentProject?.id).toBe('team-1');
	});

	it('sets the personal project as current for own personal workflows', async () => {
		route.query = { projectId: 'personal-1' };
		const store = makeStore();

		await store.setProjectNavActiveIdByWorkflowHomeProject(
			makeProject('personal-1', ProjectTypes.Personal),
		);

		expect(mockedProjectsApi.getProject).not.toHaveBeenCalled();
		expect(store.currentProject?.id).toBe('personal-1');
		expect(store.projectNavActiveId).toBe('personal-1');
	});

	it('marks workflows shared with the user as shared context', async () => {
		const store = makeStore();

		await store.setProjectNavActiveIdByWorkflowHomeProject(
			makeProject('other-personal', ProjectTypes.Personal),
			[makeProject('personal-1', ProjectTypes.Personal)],
		);

		expect(mockedProjectsApi.getProject).not.toHaveBeenCalled();
		expect(store.currentProject).toBeNull();
		expect(store.projectNavActiveId).toBe('shared');
	});
});
