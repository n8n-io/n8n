import { setActivePinia, createPinia } from 'pinia';
import { reactive } from 'vue';
import { vi } from 'vitest';
import { useProjectsStore } from '@/stores/projects.store';
import * as projectsApi from '@/api/projects.api';
import type { Project, ProjectListItem } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import type { ProjectRole, Scope } from '@n8n/permissions';

// Minimal router mock to satisfy useRoute usage in the store
vi.mock('vue-router', () => ({
	useRoute: () => reactive({ params: {}, query: {}, path: '' }),
}));

vi.mock('@/api/projects.api', () => ({
	updateProject: vi.fn(),
	getProject: vi.fn(),
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

	it('refetches project when relations are provided and does not touch name/icon/description', async () => {
		const store = makeStoreWithProject();
		mockedProjectsApi.updateProject.mockResolvedValue(undefined);
		const now = new Date().toISOString();
		const serverProject: Project = {
			id: 'p1',
			name: 'SERVER',
			description: 'SERVER',
			icon: { type: 'icon', value: 'layers' },
			type: ProjectTypes.Team,
			createdAt: now,
			updatedAt: now,
			relations: [],
			scopes: ['project:read' as Scope],
		};
		mockedProjectsApi.getProject.mockResolvedValue(serverProject);

		await store.updateProject('p1', { relations: [{ userId: 'u2', role: 'project:viewer' }] });

		// Ensure only relations were sent
		expect(mockedProjectsApi.updateProject).toHaveBeenCalledWith(expect.anything(), 'p1', {
			relations: [{ userId: 'u2', role: 'project:viewer' }],
		});
		// Refetch invoked
		expect(mockedProjectsApi.getProject).toHaveBeenCalledWith(expect.anything(), 'p1');
		// Local name/description remain unchanged eagerly; currentProject then replaced by getProject
		expect(store.myProjects[0].name).toBe('A');
		expect(store.myProjects[0].description).toBe('desc');
		expect(store.currentProject?.name).toBe('SERVER');
		expect(store.currentProject?.description).toBe('SERVER');
	});
});
