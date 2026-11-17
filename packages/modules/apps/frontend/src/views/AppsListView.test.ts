import type { AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { computed, defineComponent } from 'vue';

import { listApps } from '../apps.api';
import AppsListView from './AppsListView.vue';

vi.mock('../apps.api');

const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
const createApp = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => route,
}));
// Like the real layout: it emits the saved sort and page size, then calls `initialize`.
const ResourcesListLayoutStub = defineComponent({
	props: {
		resources: { type: Array, required: true },
		initialize: { type: Function, required: true },
		hasEmptyState: { type: Boolean, default: true },
		resourcesRefreshing: { type: Boolean, default: false },
	},
	emits: ['update:search', 'update:pagination-and-sort', 'load-more'],
	mounted() {
		this.$emit('update:pagination-and-sort', { pageSize: 50 });
		void this.initialize();
	},
	template: `<div>
		<button data-test-id="search" @click="$emit('update:search', 'expense')" />
		<button data-test-id="clear-search" @click="$emit('update:search', '')" />
		<button data-test-id="sort" @click="$emit('update:pagination-and-sort', { sort: 'nameAsc' })" />
		<button data-test-id="load-more" @click="$emit('load-more')" />
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
			props: ['mainButton'],
			template: '<div data-test-id="header" :data-main-button="mainButton"><slot /></div>',
		});
		componentRegistry.register('insights-summary', {
			template: '<div data-test-id="insights-summary" />',
		});
		capabilityRegistry.provide(capabilities.projectPermissions, {
			scopesFor: () => ['app:create', 'app:list'],
			defaultProjectId: () => 'personal-project',
			isReadOnly: () => false,
		});
		capabilityRegistry.provide(capabilities.createAppAssistantHandoff, () => ({
			available: computed(() => true),
			openApp: vi.fn(),
			createApp,
		}));
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 2 });
	});

	afterEach(() => {
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		componentRegistry.clear();
		capabilityRegistry.clear();
		route.params = {};
		vi.clearAllMocks();
	});

	it('lists the apps of the project on a project page', async () => {
		route.params = { projectId: 'project-1' };
		const { findAllByTestId, getByTestId } = renderComponent();

		expect(await findAllByTestId('app-card')).toHaveLength(2);
		expect(getByTestId('header')).toBeInTheDocument();
		expect(getByTestId('header')).toHaveAttribute('data-main-button', 'app');
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

	it('does not show the insights summary, which only the automations list shows', async () => {
		const { findAllByTestId, queryByTestId } = renderComponent();
		await findAllByTestId('app-card');

		expect(queryByTestId('insights-summary')).not.toBeInTheDocument();
	});

	it('shows the empty state when there are no apps', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [], count: 0 });
		const { findByTestId, findByText } = renderComponent();

		expect(await findByTestId('apps-empty-state')).toBeInTheDocument();
		expect(await findByText('Create your first app')).toBeVisible();
		expect(
			await findByText(
				'Give your team a dashboard, form or tracker they open in the browser. It works with your workflows, data tables and agents.',
			),
		).toBeVisible();
	});

	it('starts a pending app from the empty state', async () => {
		route.params = { projectId: 'project-1' };
		vi.mocked(listApps).mockResolvedValue({ data: [], count: 0 });
		const { findByRole } = renderComponent();

		await userEvent.click(await findByRole('button', { name: 'Create app' }));

		const appId = createApp.mock.calls.at(-1)?.[0]?.appId;
		expect(appId).toEqual(expect.any(String));
		expect(createApp).toHaveBeenCalledWith({ projectId: 'project-1', appId });
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

	it('searches by name from the first batch', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 60 });
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(1));
		await userEvent.click(getByTestId('load-more'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));

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

	it('appends the next batch after the loaded apps on load-more', async () => {
		vi.mocked(listApps)
			.mockResolvedValueOnce({ data: [app('1'), app('2')], count: 3 })
			.mockResolvedValueOnce({ data: [app('2'), app('3')], count: 3 });
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');

		await userEvent.click(getByTestId('load-more'));

		// A repeated app is not added twice
		await waitFor(async () => expect(await findAllByTestId('app-card')).toHaveLength(3));
		expect(listApps).toHaveBeenLastCalledWith(expect.anything(), undefined, {
			skip: 2,
			take: 50,
			sortBy: 'updatedAt:desc',
			name: undefined,
		});
	});

	it('does not load more when every app is loaded', async () => {
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');

		await userEvent.click(getByTestId('load-more'));

		expect(listApps).toHaveBeenCalledTimes(1);
	});

	it('reloads every loaded batch after a delete', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 60 });
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');
		await userEvent.click(getByTestId('load-more'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));

		await userEvent.click(getByTestId('delete-1'));

		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ skip: 0, take: 100 }),
			),
		);
	});

	it('starts from the first batch when the sort changes', async () => {
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 60 });
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');
		await userEvent.click(getByTestId('load-more'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(2));

		await userEvent.click(getByTestId('sort'));

		await waitFor(() =>
			expect(listApps).toHaveBeenLastCalledWith(
				expect.anything(),
				undefined,
				expect.objectContaining({ skip: 0, take: 50, sortBy: 'name:asc' }),
			),
		);
	});

	it('drops a load-more response when the list reloads meanwhile', async () => {
		let resolveMore: (value: { data: AppResponse[]; count: number }) => void = () => {};
		vi.mocked(listApps).mockResolvedValue({ data: [app('1'), app('2')], count: 60 });
		const { findAllByTestId, getByTestId } = renderComponent();
		await findAllByTestId('app-card');
		vi.mocked(listApps).mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveMore = resolve)),
		);

		await userEvent.click(getByTestId('load-more'));
		await userEvent.click(getByTestId('search'));
		await waitFor(() => expect(listApps).toHaveBeenCalledTimes(3));
		resolveMore({ data: [app('3'), app('4')], count: 60 });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(await findAllByTestId('app-card')).toHaveLength(2);
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
