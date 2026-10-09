import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectNavigationCommands } from './useProjectNavigationCommands';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { searchProjects } from '@/features/collaboration/projects/projects.api';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';
import { VIEWS } from '@/app/constants';

const routerPushMock = vi.fn();
const routerResolveMock = vi.fn(() => ({ href: '/resolved-href' }));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		resolve: routerResolveMock,
	}),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const mockCreateProject = vi.fn();
vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		createProject: mockCreateProject,
	}),
}));

vi.mock('@/features/collaboration/projects/projects.api', async (importOriginal) => ({
	...(await importOriginal()),
	searchProjects: vi.fn(),
}));

const createProject = (overrides: Partial<ProjectListItem> = {}): ProjectListItem => ({
	...createProjectListItem('team'),
	id: 'project-1',
	name: 'Marketing Team',
	icon: null,
	...overrides,
});

describe('useProjectNavigationCommands', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;

	const setStoreFlag = (
		flag: 'canViewProjects' | 'hasPermissionToCreateProjects' | 'canCreateProjects',
		value: boolean,
	) => {
		Object.defineProperty(projectsStore, flag, { value });
	};

	const searchSingleProject = async (project: ProjectListItem) => {
		vi.mocked(searchProjects).mockResolvedValue({ count: 1, data: [project] });
		const result = await useProjectNavigationCommands().source?.search({
			query: '',
			offset: 0,
			limit: 10,
		});
		return result?.items[0];
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();

		projectsStore = useProjectsStore();
		projectsStore.personalProject = createTestProject({ id: 'personal-1', type: 'personal' });

		setStoreFlag('canViewProjects', true);
		setStoreFlag('hasPermissionToCreateProjects', true);
		setStoreFlag('canCreateProjects', true);
	});

	describe('source', () => {
		it('exposes a remote projects source', () => {
			expect(useProjectNavigationCommands().source).toMatchObject({
				id: 'projects',
				title: 'commandBar.sections.projects',
				isRemote: true,
			});
		});

		it.each([true, false])(
			'reports source availability as %s from the project view permission',
			(canViewProjects) => {
				setStoreFlag('canViewProjects', canViewProjects);

				expect(useProjectNavigationCommands().source?.isAvailable()).toBe(canViewProjects);
			},
		);

		it('searches projects by trimmed query with paging', async () => {
			vi.mocked(searchProjects).mockResolvedValue({ count: 0, data: [] });

			await useProjectNavigationCommands().source?.search({
				query: '  marketing ',
				offset: 20,
				limit: 10,
			});

			expect(searchProjects).toHaveBeenCalledWith(useRootStore().restApiContext, {
				search: 'marketing',
				skip: 20,
				take: 10,
			});
		});

		it('omits the search term when the query is empty', async () => {
			vi.mocked(searchProjects).mockResolvedValue({ count: 0, data: [] });

			await useProjectNavigationCommands().source?.search({ query: '  ', offset: 0, limit: 10 });

			expect(searchProjects).toHaveBeenCalledWith(useRootStore().restApiContext, {
				skip: 0,
				take: 10,
			});
		});

		it.each([
			{ offset: 0, count: 3, hasMore: true },
			{ offset: 1, count: 3, hasMore: false },
		])(
			'reports hasMore as $hasMore for offset $offset and total count $count',
			async ({ offset, count, hasMore }) => {
				vi.mocked(searchProjects).mockResolvedValue({
					count,
					data: [createProject({ id: 'project-1' }), createProject({ id: 'project-2' })],
				});

				const result = await useProjectNavigationCommands().source?.search({
					query: '',
					offset,
					limit: 2,
				});

				expect(result?.items).toHaveLength(2);
				expect(result?.hasMore).toBe(hasMore);
			},
		);

		it('maps a team project to a command bar item that links to its workflows', async () => {
			const item = await searchSingleProject(createProject());

			expect(item).toMatchObject({
				id: 'project-1',
				title: 'Marketing Team',
				icon: { type: 'icon', value: 'layers' },
				href: '/resolved-href',
			});
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: 'project-1' },
			});
		});

		it('uses the project icon when the project has one', async () => {
			const item = await searchSingleProject(
				createProject({ icon: { type: 'icon', value: 'rocket' } }),
			);

			expect(item?.icon).toEqual({ type: 'icon', value: 'rocket' });
		});

		it('titles the own personal project with the personal label and a user icon', async () => {
			const item = await searchSingleProject(
				createProject({ id: 'personal-1', name: 'Jane Doe', type: 'personal' }),
			);

			expect(item).toMatchObject({
				title: 'projects.menu.personal',
				icon: { type: 'icon', value: 'user' },
			});
		});

		it('titles another personal project by name with a user icon', async () => {
			const item = await searchSingleProject(
				createProject({ id: 'personal-2', name: 'John Doe', type: 'personal' }),
			);

			expect(item).toMatchObject({
				title: 'John Doe',
				icon: { type: 'icon', value: 'user' },
			});
		});

		it('uses the unnamed label when the project has no name', async () => {
			const item = await searchSingleProject(createProject({ name: null }));

			expect(item?.title).toBe('commandBar.projects.unnamed');
		});

		it('navigates to the project workflows when the item handler runs', async () => {
			const item = await searchSingleProject(createProject());
			await item?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: 'project-1' },
			});
		});
	});

	describe('create project command', () => {
		const findCreateCommand = () =>
			useProjectNavigationCommands().commands.value.find(
				(command) => command.id === 'create-project',
			);

		it('shows the create command when the user can create projects', () => {
			expect(findCreateCommand()).toMatchObject({
				title: 'commandBar.projects.create',
				section: 'commandBar.sections.projects',
			});
		});

		it.each(['hasPermissionToCreateProjects', 'canCreateProjects'] as const)(
			'hides the create command when %s is false',
			(flag) => {
				setStoreFlag(flag, false);

				expect(findCreateCommand()).toBeUndefined();
			},
		);

		it('creates a project from the command bar when the create command runs', async () => {
			await findCreateCommand()?.handler?.();

			expect(mockCreateProject).toHaveBeenCalledWith('command_bar');
		});
	});
});
