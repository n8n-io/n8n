import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type { Resource } from '@/Interface';
import type router from 'vue-router';
import { waitAllPromises } from '@/__tests__/utils';
import type { ProjectSharingData } from '@/features/projects/projects.types';

const TEST_HOME_PROJECT: ProjectSharingData = vi.hoisted(() => ({
	id: '1',
	type: 'team',
	name: 'Test Project 1',
	icon: {
		type: 'emoji',
		value: '🗂️',
	},
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}));

const TEST_LOCAL_STORAGE_VALUES = vi.hoisted(() => ({
	sort: 'name',
	pageSize: 50,
}));

const TEST_WORKFLOWS: Resource[] = vi.hoisted(() => [
	{
		resourceType: 'workflow',
		id: '1',
		name: 'Test Workflow 1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		active: true,
		isArchived: false,
		readOnly: false,
		homeProject: TEST_HOME_PROJECT,
	},
	{
		resourceType: 'workflow',
		id: '2',
		name: 'Test Workflow 2',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		active: true,
		isArchived: false,
		readOnly: false,
		homeProject: TEST_HOME_PROJECT,
	},
]);

vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

vi.mock('@/composables/useN8nLocalStorage', () => {
	const loadProjectPreferencesFromLocalStorage = vi.fn().mockReturnValue(TEST_LOCAL_STORAGE_VALUES);
	const getProjectKey = vi.fn(() => TEST_HOME_PROJECT.id);

	return {
		useN8nLocalStorage: () => ({
			loadProjectPreferencesFromLocalStorage,
			getProjectKey,
		}),
	};
});

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRoute: () => ({
			params: {
				projectId: TEST_HOME_PROJECT.id,
			},
			path: `/projects/${TEST_HOME_PROJECT.id}/workflows`,
			query: {},
		}),
		useRouter: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ResourcesListLayout, {
	props: {
		resourceKey: 'workflows',
		resources: [],
		disabled: false,
		typeProps: { itemSize: 80 },
		loading: false,
	},
});

describe('ResourcesListLayout', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	it('should render loading skeleton', () => {
		const { container } = renderComponent({
			props: {
				loading: true,
			},
		});

		expect(container.querySelectorAll('.el-skeleton__p')).toHaveLength(25);
	});

	it('should render scrollable list based on `type` prop', () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-full',
			},
		});
		expect(getByTestId('resources-list-wrapper')).toBeTruthy();
		expect(getByTestId('resources-list')).toBeTruthy();
	});

	it('should render paginated list based on `type` prop', () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
			},
		});
		expect(getByTestId('resources-list-wrapper')).toBeTruthy();
		expect(getByTestId('paginated-list')).toBeTruthy();
	});

	it('should render paginated table list based on `type` prop', () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'datatable',
			},
		});
		expect(getByTestId('resources-list-wrapper')).toBeTruthy();
		expect(getByTestId('resources-table')).toBeTruthy();
	});

	it('should load sort & page size from local storage', async () => {
		const { emitted } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
			},
		});
		await waitAllPromises();
		expect(emitted()['update:pagination-and-sort']).toBeTruthy();
		expect(emitted()['update:pagination-and-sort'].pop()).toEqual([TEST_LOCAL_STORAGE_VALUES]);
	});

	it('should display info text if filters are applied', async () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
				uiConfig: {
					searchEnabled: true,
					showFiltersDropdown: true,
					sortEnabled: true,
				},
				filters: {
					search: '',
					homeProject: '',
					showArchived: true,
					testFilter: true,
				},
			},
		});

		await waitAllPromises();
		expect(getByTestId('resources-list-filters-applied-info')).toBeInTheDocument();
		expect(getByTestId('workflows-filter-reset')).toBeInTheDocument();
		expect(getByTestId('resources-list-filters-applied-info').textContent).toContain(
			'Some workflows may be hidden since filters are applied.',
		);
	});

	it('should display different info text if all applied filters display more results', async () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
				uiConfig: {
					searchEnabled: true,
					showFiltersDropdown: true,
					sortEnabled: true,
				},
				filters: {
					search: '',
					homeProject: '',
					tags: [],
					showArchived: true,
				},
			},
		});

		await waitAllPromises();
		expect(getByTestId('resources-list-filters-applied-info')).toBeInTheDocument();
		expect(getByTestId('workflows-filter-reset')).toBeInTheDocument();
		expect(getByTestId('resources-list-filters-applied-info').textContent).toContain(
			'Filters are applied.',
		);
	});

	describe('uiConfig prop', () => {
		it('should not render search input when searchEnabled is false', () => {
			const { queryByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: false,
						showFiltersDropdown: true,
						sortEnabled: true,
					},
				},
			});

			expect(queryByTestId('resources-list-search')).not.toBeInTheDocument();
		});

		it('should render search input when searchEnabled is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: true,
						sortEnabled: true,
					},
				},
			});

			expect(getByTestId('resources-list-search')).toBeInTheDocument();
		});

		it('should not render sort dropdown when sortEnabled is false', () => {
			const { queryByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: true,
						sortEnabled: false,
					},
				},
			});

			expect(queryByTestId('resources-list-sort')).not.toBeInTheDocument();
		});

		it('should render sort dropdown when sortEnabled is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: true,
						sortEnabled: true,
					},
				},
			});

			expect(getByTestId('resources-list-sort')).toBeInTheDocument();
		});

		it('should render filters dropdown trigger when showFiltersDropdown is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: true,
						sortEnabled: true,
					},
				},
			});

			// Check if filters dropdown trigger is rendered
			expect(getByTestId('resources-list-filters-trigger')).toBeInTheDocument();
		});

		it('should not render filters dropdown section when showFiltersDropdown is false', () => {
			const { queryByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: false,
						sortEnabled: true,
					},
				},
			});

			// The filters dropdown trigger should not be rendered
			expect(queryByTestId('resources-list-filters-trigger')).not.toBeInTheDocument();
		});

		it('should respect all uiConfig options when all are disabled', () => {
			const { queryByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: false,
						showFiltersDropdown: false,
						sortEnabled: false,
					},
				},
			});

			expect(queryByTestId('resources-list-search')).not.toBeInTheDocument();
			expect(queryByTestId('resources-list-sort')).not.toBeInTheDocument();
		});

		it('should respect all uiConfig options when all are enabled', () => {
			const { getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					uiConfig: {
						searchEnabled: true,
						showFiltersDropdown: true,
						sortEnabled: true,
					},
				},
			});

			expect(getByTestId('resources-list-search')).toBeInTheDocument();
			expect(getByTestId('resources-list-sort')).toBeInTheDocument();
			expect(getByTestId('resources-list-filters-trigger')).toBeInTheDocument();
		});
	});
});
