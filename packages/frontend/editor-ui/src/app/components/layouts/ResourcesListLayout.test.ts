import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import type { Resource } from '@/Interface';
import type router from 'vue-router';
import { waitAllPromises } from '@/__tests__/utils';
import userEvent from '@testing-library/user-event';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

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
		activeVersionId: 'v1',
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
		activeVersionId: 'v1',
		isArchived: false,
		readOnly: false,
		homeProject: TEST_HOME_PROJECT,
	},
]);

vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

vi.mock('@/app/composables/useN8nLocalStorage', () => {
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

	it('should render loading skeleton instead of list chrome while refreshing an empty list', () => {
		const { container, queryByTestId } = renderComponent({
			props: {
				resourcesRefreshing: true,
			},
		});

		expect(container.querySelectorAll('.el-skeleton__p')).toHaveLength(25);
		expect(queryByTestId('resources-list-search')).not.toBeInTheDocument();
	});

	it('should render the list chrome while refreshing when resources are already known', () => {
		const { getByTestId } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
				resourcesRefreshing: true,
			},
		});

		expect(getByTestId('resources-list-search')).toBeInTheDocument();
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

	it('should load the sort from local storage', async () => {
		const { emitted } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				type: 'list-paginated',
			},
		});
		await waitAllPromises();
		expect(emitted()['update:pagination-and-sort']).toBeTruthy();
		// The list loads more on scroll, so a saved page size does not apply
		expect(emitted()['update:pagination-and-sort'].pop()).toEqual([
			{ sort: TEST_LOCAL_STORAGE_VALUES.sort },
		]);
	});

	it('should change the sort from the sort menu', async () => {
		const { getByTestId, findAllByTestId, emitted } = renderComponent({
			props: {
				resources: TEST_WORKFLOWS,
				// A full list does not save the sort to the URL, which needs a real router
				type: 'list-full',
			},
		});
		await waitAllPromises();

		await userEvent.click(getByTestId('resources-list-sort'));
		const items = await findAllByTestId('resources-list-sort-item');
		expect(items.map((item) => item.textContent?.trim())).toEqual([
			'Sort by last updated',
			'Sort by last created',
			'Sort by name (A-Z)',
			'Sort by name (Z-A)',
		]);

		await userEvent.click(items[2]);
		await waitAllPromises();

		expect(emitted()['update:pagination-and-sort'].pop()).toEqual([{ sort: 'nameAsc' }]);
	});

	describe('load more', () => {
		let observerCallback: IntersectionObserverCallback | undefined;
		const observe = vi.fn();

		beforeEach(() => {
			observerCallback = undefined;
			observe.mockClear();
			vi.stubGlobal(
				'IntersectionObserver',
				vi.fn(function (callback: IntersectionObserverCallback) {
					observerCallback = callback;
					return { observe, disconnect: vi.fn(), unobserve: vi.fn() };
				}),
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should show a placeholder instead of pagination while more resources exist', async () => {
			const { queryByTestId, getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					totalItems: TEST_WORKFLOWS.length + 10,
				},
			});
			await waitAllPromises();

			expect(queryByTestId('resources-list-pagination')).not.toBeInTheDocument();
			expect(getByTestId('resources-list-load-more')).toBeInTheDocument();
		});

		it('should not show the placeholder when all resources are loaded', async () => {
			const { queryByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					totalItems: TEST_WORKFLOWS.length,
				},
			});
			await waitAllPromises();

			expect(queryByTestId('resources-list-load-more')).not.toBeInTheDocument();
		});

		it('should emit load-more when the end of the list is near', async () => {
			const { emitted, getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					totalItems: TEST_WORKFLOWS.length + 10,
				},
			});
			await waitAllPromises();

			expect(observe).toHaveBeenCalledWith(getByTestId('resources-list-load-more'));
			expect(emitted()['load-more']).toBeUndefined();

			observerCallback?.(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver,
			);

			expect(emitted()['load-more']).toHaveLength(1);
		});

		it('should show the total count in the column header', async () => {
			const { getByTestId } = renderComponent({
				props: {
					resources: TEST_WORKFLOWS,
					type: 'list-paginated',
					totalItems: 123,
					listColumns: [{ key: 'name', label: 'Name' }],
				},
			});
			await waitAllPromises();

			expect(getByTestId('resources-list-count')).toHaveTextContent('123');
		});
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
