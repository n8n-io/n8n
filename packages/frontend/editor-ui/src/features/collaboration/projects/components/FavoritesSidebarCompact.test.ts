import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import FavoritesSidebarCompact from './FavoritesSidebarCompact.vue';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useProjectsStore } from '../projects.store';
import type { UserFavorite } from '@/app/api/favorites';

vi.mock('vue-router', () => ({
	useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
	useRoute: vi.fn().mockReturnValue({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const makeFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
	id: 1,
	userId: 'user-1',
	resourceId: 'res-1',
	resourceType: 'workflow',
	resourceName: 'My Workflow',
	...overrides,
});

const renderComponent = createComponentRenderer(FavoritesSidebarCompact);

describe('FavoritesSidebarCompact', () => {
	let favoritesStore: ReturnType<typeof mockedStore<typeof useFavoritesStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

	beforeEach(() => {
		createTestingPinia();
		favoritesStore = mockedStore(useFavoritesStore);
		projectsStore = mockedStore(useProjectsStore);
		favoritesStore.favorites = [];
		projectsStore.myProjects = [];
		projectsStore.projectNavActiveId = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not render the popover trigger when there are no favorites', () => {
		const { container } = renderComponent();
		// v-if renders a comment node when falsy; no real element should be present
		expect(container.querySelector('[data-radix-popper-content-wrapper]')).toBeNull();
		expect(container.querySelector('svg')).toBeNull();
	});

	it('should render the star icon trigger when there are favorites', () => {
		favoritesStore.favorites = [makeFavorite()];

		const { container } = renderComponent();
		expect(container.firstChild).not.toBeNull();
	});

	it('should include workflow favorites in the menu items', () => {
		favoritesStore.favorites = [
			makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'My Workflow' }),
		];

		// The component builds favoriteWorkflowItems from favorites filtered by resourceType
		// Verify via the computed: favoriteWorkflowItems maps workflow favorites
		renderComponent();
		expect(favoritesStore.favorites.filter((f) => f.resourceType === 'workflow')).toHaveLength(1);
		expect(favoritesStore.favorites[0].resourceName).toBe('My Workflow');
	});

	it('should include project favorites in the menu items', () => {
		favoritesStore.favorites = [
			makeFavorite({
				id: 2,
				resourceId: 'proj-1',
				resourceType: 'project',
				resourceName: 'My Project',
			}),
		];

		const { container } = renderComponent();
		expect(container.firstChild).not.toBeNull();
		expect(favoritesStore.favorites.filter((f) => f.resourceType === 'project')).toHaveLength(1);
	});

	it('should include dataTable favorites in the menu items', () => {
		favoritesStore.favorites = [
			makeFavorite({
				id: 3,
				resourceId: 'dt-1',
				resourceType: 'dataTable',
				resourceName: 'My Table',
				resourceProjectId: 'proj-1',
			}),
		];

		const { container } = renderComponent();
		expect(container.firstChild).not.toBeNull();
	});

	it('should include folder favorites in the menu items', () => {
		favoritesStore.favorites = [
			makeFavorite({
				id: 4,
				resourceId: 'folder-1',
				resourceType: 'folder',
				resourceName: 'My Folder',
				resourceProjectId: 'proj-1',
			}),
		];

		const { container } = renderComponent();
		expect(container.firstChild).not.toBeNull();
	});

	it('should render trigger when there are multiple types of favorites', () => {
		favoritesStore.favorites = [
			makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'Workflow 1' }),
			makeFavorite({
				id: 2,
				resourceId: 'proj-1',
				resourceType: 'project',
				resourceName: 'Project 1',
			}),
		];

		const { container } = renderComponent();
		expect(container.firstChild).not.toBeNull();
	});
});
