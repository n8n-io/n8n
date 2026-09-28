import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import ExecutionsView from './ExecutionsView.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { VIEWS } from '@/app/constants';
import type { Project } from '@/features/collaboration/projects/projects.types';
import type { IWorkflowDb } from '@/Interface';
import { ref } from 'vue';

const push = vi.fn();
const replace = vi.fn();
const rawRoute = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
	name: '',
}));
const query = ref(rawRoute.query);
const route = {
	...rawRoute,
	get query() {
		return query.value;
	},
	set query(value: Record<string, string>) {
		query.value = value;
	},
};

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push, replace }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const renderComponent = createComponentRenderer(ExecutionsView, {
	global: {
		stubs: {
			ProjectHeader: { template: '<div data-test-id="project-header-stub" />' },
			GlobalExecutionsList: {
				props: ['filters'],
				emits: ['execution:stop', 'update:filters'],
				template:
					'<div data-test-id="global-executions-list-stub"><button data-test-id="stop-stub" @click="$emit(\'execution:stop\')" /><button data-test-id="filter-error-stub" @click="$emit(\'update:filters\', { ...filters, status: \'error\' })" /><slot /></div>',
			},
			InsightsSummary: true,
		},
	},
});

describe('ExecutionsView', () => {
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		push.mockClear();
		replace.mockReset();
		route.params = {};
		route.query = {};
		route.name = '';

		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.allWorkflows = [];
		workflowsListStore.fetchAllWorkflows.mockResolvedValue([]);
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(false);

		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.getProject.mockResolvedValue(undefined);
		projectsStore.personalProject = {
			id: 'p1',
			scopes: ['workflow:create'],
		} as Project;
	});

	it('shows neutral loading while workflow emptiness is unknown', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('executions-loading-state')).toBeInTheDocument();
		expect(queryByTestId('global-executions-list-stub')).not.toBeInTheDocument();

		await waitAllPromises();
	});

	it('shows the executions empty state when there are no workflows', async () => {
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		const emptyState = getByTestId('empty-resources-list');
		expect(within(emptyState).getByText('No executions yet')).toBeVisible();
		expect(queryByTestId('global-executions-list-stub')).not.toBeInTheDocument();

		await fireEvent.click(within(emptyState).getByRole('button', { name: 'Create workflow' }));
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.NEW_WORKFLOW,
			query: { projectId: undefined },
		});
	});

	it('falls back to the executions list when the workflows fetch fails', async () => {
		workflowsListStore.allWorkflowsFetched = true;
		workflowsListStore.fetchAllWorkflows.mockRejectedValue(new Error('network error'));

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(queryByTestId('executions-loading-state')).not.toBeInTheDocument();
		expect(getByTestId('global-executions-list-stub')).toBeInTheDocument();
	});

	it('shows the executions list when workflows exist', async () => {
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);
		workflowsListStore.allWorkflows = [{ id: 'w1' } as IWorkflowDb];

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('global-executions-list-stub')).toBeInTheDocument();
		expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
	});

	it('shows the executions list when all workflows are archived', async () => {
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);
		workflowsListStore.allWorkflows = [{ id: 'w1', isArchived: true } as IWorkflowDb];

		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('global-executions-list-stub')).toBeInTheDocument();
		expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
	});

	it('refreshes after a stop without dropping the loaded pages', async () => {
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);
		workflowsListStore.allWorkflows = [{ id: 'w1' } as IWorkflowDb];
		const executionsStore = mockedStore(useExecutionsStore);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		await fireEvent.click(getByTestId('stop-stub'));

		expect(executionsStore.refreshExecutions).toHaveBeenCalled();
	});

	it('checks workflow emptiness for the current project scope', async () => {
		route.params.projectId = 'project-1';
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(workflowsListStore.fetchAllWorkflows).toHaveBeenCalledWith('project-1');
		expect(workflowsListStore.hasFetchedAllWorkflows).toHaveBeenCalledWith('project-1');
		expect(getByTestId('empty-resources-list')).toBeInTheDocument();
	});

	it('keeps an execution status filter after leaving and returning to the executions view (LIGO-803)', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		const listStore = useWorkflowsListStore();
		listStore.workflowsById = { w1: { id: 'w1', name: 'Workflow' } as IWorkflowDb };
		vi.spyOn(listStore, 'fetchAllWorkflows').mockResolvedValue([]);
		vi.spyOn(listStore, 'hasFetchedAllWorkflows').mockReturnValue(true);
		vi.spyOn(executionsStore, 'initialize').mockResolvedValue();
		replace.mockImplementation(async ({ query }: { query: Record<string, string> }) => {
			route.query = query;
		});

		const view = renderComponent({ pinia });
		await waitAllPromises();
		expect(view.getByTestId('global-executions-list-stub')).toBeInTheDocument();
		expect(executionsStore.filters.status).toBe('all');

		await fireEvent.click(view.getByTestId('filter-error-stub'));
		await waitAllPromises();
		expect(executionsStore.filters.status).toBe('error');

		view.unmount();
		route.query = {};
		const returnedView = renderComponent({ pinia });
		await waitAllPromises();

		expect(returnedView.getByTestId('global-executions-list-stub')).toBeInTheDocument();
		expect(executionsStore.filters.status).toBe('error');
		expect(JSON.parse(route.query.executionFilters)).toMatchObject({ status: 'error' });
	});

	it('restores filters from a shared executions link before loading', async () => {
		route.query = {
			executionFilters: JSON.stringify({ status: 'error', startDate: '2026-09-01T12:00:00.000Z' }),
		};
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		const listStore = useWorkflowsListStore();
		vi.spyOn(executionsStore, 'initialize').mockResolvedValue();
		vi.spyOn(listStore, 'fetchAllWorkflows').mockResolvedValue([]);
		vi.spyOn(listStore, 'hasFetchedAllWorkflows').mockReturnValue(true);
		listStore.workflowsById = { w1: { id: 'w1' } as IWorkflowDb };

		const { getByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getByTestId('global-executions-list-stub')).toBeInTheDocument();
		expect(executionsStore.filters.status).toBe('error');
		expect(executionsStore.filters.startDate).toEqual(new Date('2026-09-01T12:00:00.000Z'));
		expect(executionsStore.initialize).toHaveBeenCalled();
	});

	it('reloads executions when the filter query changes without remounting', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		vi.spyOn(executionsStore, 'initialize').mockResolvedValue();
		vi.spyOn(useWorkflowsListStore(), 'fetchAllWorkflows').mockResolvedValue([]);

		const view = renderComponent({ pinia });
		await waitAllPromises();
		route.query = { executionFilters: JSON.stringify({ status: 'error' }) };
		await waitAllPromises();

		expect(executionsStore.filters.status).toBe('error');
		expect(executionsStore.initialize).toHaveBeenCalledTimes(2);
		view.unmount();
	});

	it('restores the filter URL before the executions request finishes', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		executionsStore.setFilters({ ...executionsStore.filters, status: 'error' });
		let finishRequest: (() => void) | undefined;
		vi.spyOn(executionsStore, 'initialize').mockImplementation(
			async () =>
				await new Promise<void>((resolve) => {
					finishRequest = resolve;
				}),
		);
		vi.spyOn(useWorkflowsListStore(), 'fetchAllWorkflows').mockResolvedValue([]);
		replace.mockImplementation(async ({ query }: { query: Record<string, string> }) => {
			route.query = query;
		});

		const view = renderComponent({ pinia });
		await waitAllPromises();
		expect(JSON.parse(route.query.executionFilters)).toMatchObject({ status: 'error' });
		view.unmount();
		finishRequest?.();
		await waitAllPromises();
	});

	it('invalidates a pending initialization when the view unmounts', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		let isCurrent: (() => boolean) | undefined;
		vi.spyOn(executionsStore, 'initialize').mockImplementation(async (_workflowId, check) => {
			isCurrent = check;
		});
		vi.spyOn(useWorkflowsListStore(), 'fetchAllWorkflows').mockResolvedValue([]);

		const view = renderComponent({ pinia });
		await waitAllPromises();
		expect(isCurrent?.()).toBe(true);
		view.unmount();
		expect(isCurrent?.()).toBe(false);
	});

	it('uses default filters when the URL filter is invalid', async () => {
		route.query = { executionFilters: '{invalid' };
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const executionsStore = useExecutionsStore();
		executionsStore.filters.status = 'error';
		vi.spyOn(executionsStore, 'initialize').mockResolvedValue();
		vi.spyOn(useWorkflowsListStore(), 'fetchAllWorkflows').mockResolvedValue([]);

		renderComponent({ pinia });
		await waitAllPromises();

		expect(executionsStore.filters.status).toBe('all');
	});
});
