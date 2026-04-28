import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useProjectsStore } from '../projects.store';
import type { UserFavorite } from '@/app/api/favorites';
import { useFavoriteNavItems } from './useFavoriteNavItems';
import { VIEWS } from '@/app/constants';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
		useRoute: vi.fn().mockReturnValue({ params: {}, query: {} }),
	};
});

const makeFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
	id: 1,
	userId: 'user-1',
	resourceId: 'res-1',
	resourceType: 'workflow',
	resourceName: 'My Resource',
	...overrides,
});

describe('useFavoriteNavItems', () => {
	let favoritesStore: ReturnType<typeof mockedStore<typeof useFavoritesStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		favoritesStore = mockedStore(useFavoritesStore);
		projectsStore = mockedStore(useProjectsStore);
		favoritesStore.favorites = [];
		projectsStore.myProjects = [];
		projectsStore.projectNavActiveId = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('favoriteWorkflowItems', () => {
		it('should map workflow favorites to menu items', () => {
			favoritesStore.favorites = [
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'Workflow 1' }),
			];

			const { favoriteWorkflowItems } = useFavoriteNavItems();

			expect(favoriteWorkflowItems.value).toHaveLength(1);
			expect(favoriteWorkflowItems.value[0].resourceId).toBe('wf-1');
			expect(favoriteWorkflowItems.value[0].resourceType).toBe('workflow');
			expect(favoriteWorkflowItems.value[0].menuItem).toMatchObject({
				id: 'favorite-workflow-wf-1',
				label: 'Workflow 1',
				icon: 'log-in',
				route: { to: { name: VIEWS.WORKFLOW, params: { workflowId: 'wf-1' } } },
			});
		});

		it('should return empty array when no workflow favorites', () => {
			favoritesStore.favorites = [makeFavorite({ resourceId: 'proj-1', resourceType: 'project' })];

			const { favoriteWorkflowItems } = useFavoriteNavItems();

			expect(favoriteWorkflowItems.value).toHaveLength(0);
		});
	});

	describe('favoriteProjectItems', () => {
		it('should map project favorites to menu items using project icon when found', () => {
			favoritesStore.favorites = [
				makeFavorite({ resourceId: 'proj-1', resourceType: 'project', resourceName: 'My Project' }),
			];
			projectsStore.myProjects = [{ id: 'proj-1', icon: 'layers' } as never];

			const { favoriteProjectItems } = useFavoriteNavItems();

			expect(favoriteProjectItems.value).toHaveLength(1);
			expect(favoriteProjectItems.value[0].resourceId).toBe('proj-1');
			expect(favoriteProjectItems.value[0].resourceType).toBe('project');
			expect(favoriteProjectItems.value[0].menuItem).toMatchObject({
				id: 'proj-1',
				label: 'My Project',
				icon: 'layers',
				route: { to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: 'proj-1' } } },
			});
		});

		it('should use default layers icon when project is not in myProjects', () => {
			favoritesStore.favorites = [
				makeFavorite({ resourceId: 'proj-1', resourceType: 'project', resourceName: 'My Project' }),
			];
			projectsStore.myProjects = [];

			const { favoriteProjectItems } = useFavoriteNavItems();

			expect(favoriteProjectItems.value[0].menuItem.icon).toBe('layers');
		});

		it('should use raw resourceId as item id (no prefix)', () => {
			favoritesStore.favorites = [
				makeFavorite({ resourceId: 'proj-1', resourceType: 'project', resourceName: 'My Project' }),
			];

			const { favoriteProjectItems } = useFavoriteNavItems();

			expect(favoriteProjectItems.value[0].menuItem.id).toBe('proj-1');
		});
	});

	describe('favoriteDataTableItems', () => {
		it('should map dataTable favorites with projectId to menu items', () => {
			favoritesStore.favorites = [
				makeFavorite({
					resourceId: 'dt-1',
					resourceType: 'dataTable',
					resourceName: 'My Table',
					resourceProjectId: 'proj-1',
				}),
			];

			const { favoriteDataTableItems } = useFavoriteNavItems();

			expect(favoriteDataTableItems.value).toHaveLength(1);
			expect(favoriteDataTableItems.value[0].resourceId).toBe('dt-1');
			expect(favoriteDataTableItems.value[0].resourceType).toBe('dataTable');
			expect(favoriteDataTableItems.value[0].menuItem).toMatchObject({
				id: 'favorite-datatable-dt-1',
				label: 'My Table',
				icon: 'table',
				route: {
					to: {
						name: DATA_TABLE_DETAILS,
						params: { projectId: 'proj-1', id: 'dt-1' },
					},
				},
			});
		});

		it('should exclude dataTable favorites without resourceProjectId', () => {
			favoritesStore.favorites = [
				makeFavorite({
					resourceId: 'dt-1',
					resourceType: 'dataTable',
					resourceName: 'My Table',
					resourceProjectId: undefined,
				}),
			];

			const { favoriteDataTableItems } = useFavoriteNavItems();

			expect(favoriteDataTableItems.value).toHaveLength(0);
		});
	});

	describe('favoriteFolderItems', () => {
		it('should map folder favorites with projectId to menu items', () => {
			favoritesStore.favorites = [
				makeFavorite({
					resourceId: 'folder-1',
					resourceType: 'folder',
					resourceName: 'My Folder',
					resourceProjectId: 'proj-1',
				}),
			];

			const { favoriteFolderItems } = useFavoriteNavItems();

			expect(favoriteFolderItems.value).toHaveLength(1);
			expect(favoriteFolderItems.value[0].resourceId).toBe('folder-1');
			expect(favoriteFolderItems.value[0].resourceType).toBe('folder');
			expect(favoriteFolderItems.value[0].menuItem).toMatchObject({
				id: 'favorite-folder-folder-1',
				label: 'My Folder',
				icon: 'folder',
				route: {
					to: {
						name: VIEWS.PROJECTS_FOLDERS,
						params: { projectId: 'proj-1', folderId: 'folder-1' },
					},
				},
			});
		});

		it('should exclude folder favorites without resourceProjectId', () => {
			favoritesStore.favorites = [
				makeFavorite({
					resourceId: 'folder-1',
					resourceType: 'folder',
					resourceName: 'My Folder',
					resourceProjectId: undefined,
				}),
			];

			const { favoriteFolderItems } = useFavoriteNavItems();

			expect(favoriteFolderItems.value).toHaveLength(0);
		});
	});

	describe('favoriteGroups', () => {
		it('should return empty array when no favorites', () => {
			const { favoriteGroups } = useFavoriteNavItems();

			expect(favoriteGroups.value).toHaveLength(0);
		});

		it('should include only groups with items', () => {
			favoritesStore.favorites = [
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'Workflow 1' }),
			];

			const { favoriteGroups } = useFavoriteNavItems();

			expect(favoriteGroups.value).toHaveLength(1);
			expect(favoriteGroups.value[0].type).toBe('workflow');
		});

		it('should order groups: projects first, then folders, workflows, dataTables', () => {
			favoritesStore.favorites = [
				makeFavorite({ id: 1, resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({
					id: 2,
					resourceId: 'proj-1',
					resourceType: 'project',
					resourceName: 'Project 1',
				}),
				makeFavorite({
					id: 3,
					resourceId: 'dt-1',
					resourceType: 'dataTable',
					resourceName: 'Table 1',
					resourceProjectId: 'proj-1',
				}),
				makeFavorite({
					id: 4,
					resourceId: 'folder-1',
					resourceType: 'folder',
					resourceName: 'Folder 1',
					resourceProjectId: 'proj-1',
				}),
			];

			const { favoriteGroups } = useFavoriteNavItems();

			expect(favoriteGroups.value.map((g) => g.type)).toEqual([
				'project',
				'folder',
				'workflow',
				'dataTable',
			]);
		});
	});

	describe('activeTabId', () => {
		it('should return undefined when projectNavActiveId is null', () => {
			projectsStore.projectNavActiveId = null;

			const { activeTabId } = useFavoriteNavItems();

			expect(activeTabId.value).toBeUndefined();
		});

		it('should return the id when projectNavActiveId is a string', () => {
			projectsStore.projectNavActiveId = 'proj-1';

			const { activeTabId } = useFavoriteNavItems();

			expect(activeTabId.value).toBe('proj-1');
		});

		it('should return the first element when projectNavActiveId is an array', () => {
			projectsStore.projectNavActiveId = ['proj-1', 'proj-2'];

			const { activeTabId } = useFavoriteNavItems();

			expect(activeTabId.value).toBe('proj-1');
		});
	});

	describe('onFavoriteProjectClick', () => {
		it('should call setCurrentProject with the found project', () => {
			const project = { id: 'proj-1', name: 'My Project' } as never;
			projectsStore.myProjects = [project];

			const { onFavoriteProjectClick } = useFavoriteNavItems();
			onFavoriteProjectClick('proj-1');

			expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(project);
		});

		it('should not call setCurrentProject when project is not found', () => {
			projectsStore.myProjects = [];

			const { onFavoriteProjectClick } = useFavoriteNavItems();
			onFavoriteProjectClick('proj-not-found');

			expect(projectsStore.setCurrentProject).not.toHaveBeenCalled();
		});
	});

	describe('onFavoriteWorkflowClick', () => {
		it('should call setCurrentProject with null', () => {
			const { onFavoriteWorkflowClick } = useFavoriteNavItems();
			onFavoriteWorkflowClick();

			expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(null);
		});
	});

	describe('onUnpinFavorite', () => {
		it('should call toggleFavorite with the given resourceId and resourceType', async () => {
			favoritesStore.toggleFavorite.mockResolvedValue();

			const { onUnpinFavorite } = useFavoriteNavItems();
			await onUnpinFavorite('wf-1', 'workflow');

			expect(favoritesStore.toggleFavorite).toHaveBeenCalledWith('wf-1', 'workflow');
		});
	});
});
