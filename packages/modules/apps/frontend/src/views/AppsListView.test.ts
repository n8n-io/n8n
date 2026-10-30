import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';

import { listApps } from '../apps.api';
import AppsListView from './AppsListView.vue';

vi.mock('../apps.api');

const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
const setCurrentPage = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => route,
}));
// Like the real layout: it emits the saved pagination preferences, then calls `initialize`.
const ResourcesListLayoutStub = defineComponent({
	props: {
		resources: { type: Array, required: true },
		initialize: { type: Function, required: true },
		hasEmptyState: { type: Boolean, default: true },
		resourcesRefreshing: { type: Boolean, default: false },
	},
	emits: ['update:search', 'update:pagination-and-sort'],
	methods: {
		async setCurrentPage(page: number) {
			setCurrentPage(page);
			this.$emit('update:pagination-and-sort', { page });
		},
	},
	mounted() {
		this.$emit('update:pagination-and-sort', { pageSize: 50 });
		void this.initialize();
	},
	template: `<div>
		<button data-test-id="search" @click="$emit('update:search', 'expense')" />
		<button data-test-id="clear-search" @click="$emit('update:search', '')" />
		<button data-test-id="sort" @click="$emit('update:pagination-and-sort', { sort: 'nameAsc', page: 2 })" />
		<button data-test-id="sort-inherited" @click="$emit('update:pagination-and-sort', { sort: 'constructor' })" />
		<button data-test-id="switch-project" @click="$emit('update:filters', { search: '', homeProject: '' }); initialize()" />
		<div v-if="resourcesRefreshing" data-test-id="refreshing" />
		<slot name="header" />
		<slot v-if="hasEmptyState && resources.length === 0" name="empty" />
		<slot v-for="item in resources" :key="item.id" name="item" :item="item" />
	</div>`,
});

const app = (id: string): AppResponse => ({
	id,
	projectId: 'project-1',
	name: `App ${id}`,
	namespace: `app-${id}`,
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const renderComponent = createComponentRenderer(AppsListView, {
	global: {
		stubs: {
			AppCard: {
				props: ['app'],
				emits: ['deleted'],
				template:
					'<div data-test-id="app-card"><button :data-test-id="\'delete-\' + app.id" @click="$emit(\'deleted\', app.id)" /><button :data-test-id="\'delete-other-\' + app.id" @click="$emit(\'deleted\', \'other-app\')" /></div>',
			},
		},
	},
});

describe('AppsListView', () => {
	beforeEach(() => {
		// Read by `useDebounce`: makes every debounced fetch run on the next tick.
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0');
		componentRegistry.register('resources-list-layout', ResourcesListLayoutStub);
		componentRegistry.register('project-header', {
			template: '<div data-test-id="header"><slot /></div>',
		});
		componentRegistry.register('insights-summary', {
			template: '<div data-test-id="insights-summary" />',
		});
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 2 });
	});

	afterEach(() => {
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		componentRegistry.clear();
		route.params = {};
		vi.clearAllMocks();
	});

	it('lists the apps of the project on a project page', async () => {
		route.params = { projectId: 'project-1' };
		const { findAllByTestId, getByTestId } = renderComponent();

		expect(await findAllByTestId('app-card')).toHaveLength(2);
		expect(getByTestId('header')).toBeInTheDocument();
		expect(listApps).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			skip: 0,
			take: 50,
			sortBy: 'updatedAt:desc',
			name: undefined,
		});
	});

	it('loads the list once when the layout emits its saved pagination before initializing', async () => {
		const { findAllByTestId } = renderComponent();
		await findAllByTestId('app-card');

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(listApps).toHaveBeenCalledTimes(1);
	});

	it('lists the apps of all projects on the overview page', async () => {
		renderComponent();

		await waitFor(() =>
			expect(listApps).toHaveBeenCalledWith(expect.anything(), undefined, expect.anything()),
		);
	});

	it('shows the insights summary on the overview page only', async () => {
		const overview = renderComponent();
		expect(await overview.findByTestId('insights-summary')).toBeInTheDocument();
		overview.unmount();

		route.params = { projectId: 'project-1' };
		const project = renderComponent();
		await project.findAllByTestId('app-card');
		expect(project.queryByTestId('insights-summary')).not.toBeInTheDocument();
	});

	it('shows the empty state when there are no apps', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [], count: 0 });
		const { findByTestId } = renderComponent();

		expect(await findByTestId('apps-empty-state')).toBeInTheDocument();
	});

	it('does not show the empty state while a search is cleared', async () => {
		const { getByTestId, findAllByTestId, queryByTestId } = renderComponent();
		await findAllByTestId('app-card');
		vi.mocked(listApps).mockResolvedValue({ data: [], count: 0 });
		await userEvent.click(getByTestId('search'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));
		vi.mocked(listApps).mockReturnValue(new Promise(() => {}));

		await userEvent.click(getByTestId('clear-search'));

		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(3));
		expect(queryByTestId('apps-empty-state')).not.toBeInTheDocument();
	});

	it('keeps the shown list during a fast reload and shows the loading rows only after a delay', async () => {
		const { findAllByTestId, findByTestId, getByTestId, queryByTestId } = renderComponent();
		await findAllByTestId('app-card');
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0.2');
		vi.mocked(listApps).mockReturnValue(new Promise(() => {}));

		await userEvent.click(getByTestId('delete-2'));

		expect(listApps).toHaveBeenCalledTimes(2);
		expect(queryByTestId('refreshing')).not.toBeInTheDocument();
		expect(await findByTestId('refreshing')).toBeInTheDocument();
	});

	it('searches by name from the first page', async () => {
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('sort'));
		await userEvent.click(getByTestId('search'));

		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(expect.anything(), undefined, {
				skip: 0,
				take: 50,
				sortBy: 'name:asc',
				name: 'expense',
			}),
		);
	});

	it('drops the search term when the layout resets its filters on a project switch', async () => {
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(1));
		await userEvent.click(getByTestId('search'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));

		await userEvent.click(getByTestId('switch-project'));

		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ name: undefined }),
			),
		);
	});

	it('ignores a sort key that is not one of the sort options', async () => {
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('sort-inherited'));

		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));
		expect(listApps).toHaveBeenLastCalledWith(
			expect.anything(),
			undefined,
			expect.objectContaining({ sortBy: 'updatedAt:desc' }),
		);
	});

	it('keeps the newest list when an older request finishes later', async () => {
		let resolveFirst: (value: { data: AppResponse[]; count: number }) => void = () => {};
		vi.mocked(listApps)
			.mockImplementationOnce(async () => await new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce({ data: [app('2')], count: 1 });
		const { getByTestId, findAllByTestId } = renderComponent();

		await userEvent.click(getByTestId('search'));
		expect(await findAllByTestId('app-card')).toHaveLength(1);
		resolveFirst({ data: [app('1'), app('2'), app('3')], count: 3 });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(await findAllByTestId('app-card')).toHaveLength(1);
	});

	it('moves the layout to the previous page when a delete empties the page', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('51')], count: 51 });
		const { findAllByTestId, getByTestId, queryByTestId } = renderComponent();
		await findAllByTestId('app-card');
		await userEvent.click(getByTestId('sort'));
		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ skip: 50 }),
			),
		);
		let resolvePrevious: (value: { data: AppResponse[]; count: number }) => void = () => {};
		vi.mocked(listApps).mockImplementationOnce(
			async () => await new Promise((resolve) => (resolvePrevious = resolve)),
		);

		await userEvent.click(getByTestId('delete-51'));

		expect(setCurrentPage).toHaveBeenCalledWith(1);
		expect(listApps).toHaveBeenLastCalledWith(
			expect.anything(),
			undefined,
			expect.objectContaining({ skip: 0 }),
		);
		expect(queryByTestId('apps-empty-state')).not.toBeInTheDocument();
		resolvePrevious({ data: [app('1'), app('2')], count: 50 });
		await waitFor(() => expect(getByTestId('delete-2')).toBeInTheDocument());
	});

	it('drops a response that is still in flight when a new fetch is scheduled', async () => {
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '1');
		let resolveFirst: (value: { data: AppResponse[]; count: number }) => void = () => {};
		vi.mocked(listApps).mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveFirst = resolve)),
		);
		const { getByTestId, queryAllByTestId } = renderComponent();

		await userEvent.click(getByTestId('sort'));
		resolveFirst({ data: [app('1'), app('2'), app('3')], count: 3 });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(queryAllByTestId('app-card')).toHaveLength(0);
		await waitFor(() => expect(queryAllByTestId('app-card')).toHaveLength(2));
		expect(listApps).toHaveBeenCalledTimes(2);
	});

	it('removes the deleted card when loading the previous page fails', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('51')], count: 51 });
		const { findAllByTestId, getByTestId, queryByTestId } = renderComponent();
		await findAllByTestId('app-card');
		await userEvent.click(getByTestId('sort'));
		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ skip: 50 }),
			),
		);
		vi.mocked(listApps).mockRejectedValueOnce(new Error('Network error'));

		await userEvent.click(getByTestId('delete-51'));

		await waitFor(() => expect(queryByTestId('delete-51')).not.toBeInTheDocument());
	});

	it('stays on the page when the deleted app is not the only card shown', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('52')], count: 52 });
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');
		await userEvent.click(getByTestId('sort'));
		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ skip: 50 }),
			),
		);

		await userEvent.click(getByTestId('delete-other-52'));

		expect(setCurrentPage).not.toHaveBeenCalled();
		expect(getByTestId('delete-52')).toBeInTheDocument();
	});

	it('removes a deleted app and reloads the list', async () => {
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');
		vi.mocked(listApps).mockResolvedValue({ data: [app('2')], count: 1 });

		await userEvent.click(getByTestId('delete-1'));

		await waitFor(async () => expect(await findAllByTestId('app-card')).toHaveLength(1));
		expect(listApps).toHaveBeenCalledTimes(2);
	});
});
