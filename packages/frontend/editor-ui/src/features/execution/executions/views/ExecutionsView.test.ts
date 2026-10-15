import { reactive } from 'vue';
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

const push = vi.fn();
const route = reactive({
	params: {} as Record<string, string>,
	query: {},
	name: '',
});

vi.mock('@/features/collaboration/projects/projects.api');

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const renderComponent = createComponentRenderer(ExecutionsView, {
	global: {
		stubs: {
			ProjectHeader: { template: '<div data-test-id="project-header-stub" />' },
			GlobalExecutionsList: {
				props: ['filters'],
				emits: ['execution:stop', 'update:filters'],
				template: `<div data-test-id="global-executions-list-stub">
					<button data-test-id="stop-stub" @click="$emit('execution:stop')" />
					<button data-test-id="filter-error-stub" @click="$emit('update:filters', { ...filters, status: 'error' })" />
					<span data-test-id="filter-status-stub">{{ filters.status }}</span>
					<slot />
				</div>`,
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
		route.params = {};
		route.query = {};
		route.name = '';

		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.allWorkflows = [];
		workflowsListStore.fetchAllWorkflows.mockResolvedValue([]);
		workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(false);

		mockedStore(useProjectsStore).personalProject = {
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

	describe('filters', () => {
		beforeEach(() => {
			// Use the real store actions, so the filters go through reset, save, and restore.
			setActivePinia(createTestingPinia({ stubActions: false }));
			workflowsListStore = mockedStore(useWorkflowsListStore);
			workflowsListStore.allWorkflows = [{ id: 'w1' } as IWorkflowDb];
			workflowsListStore.fetchAllWorkflows.mockResolvedValue([]);
			workflowsListStore.hasFetchedAllWorkflows.mockReturnValue(true);
			mockedStore(useExecutionsStore).initialize.mockResolvedValue();
		});

		it('keeps separate filters for Overview and projects after navigating away and back', async () => {
			const overview = renderComponent();
			await waitAllPromises();
			await fireEvent.click(overview.getByTestId('filter-error-stub'));
			overview.unmount();

			route.params.projectId = 'project-1';
			const project = renderComponent();
			await waitAllPromises();
			expect(project.getByTestId('filter-status-stub')).toHaveTextContent('all');
			await fireEvent.click(project.getByTestId('filter-error-stub'));
			project.unmount();

			route.params = {};
			const overviewAgain = renderComponent();
			await waitAllPromises();
			expect(overviewAgain.getByTestId('filter-status-stub')).toHaveTextContent('error');
			overviewAgain.unmount();

			route.params.projectId = 'project-1';
			const projectAgain = renderComponent();
			await waitAllPromises();
			expect(projectAgain.getByTestId('filter-status-stub')).toHaveTextContent('error');
		});

		it('loads the filters of the new project when only the project changes', async () => {
			const executionsStore = mockedStore(useExecutionsStore);
			route.params.projectId = 'project-1';
			const { getByTestId } = renderComponent();
			await waitAllPromises();
			await fireEvent.click(getByTestId('filter-error-stub'));
			executionsStore.initialize.mockClear();

			route.params.projectId = 'project-2';
			await waitAllPromises();
			expect(getByTestId('filter-status-stub')).toHaveTextContent('all');
			expect(executionsStore.initialize).toHaveBeenCalled();

			route.params.projectId = 'project-1';
			await waitAllPromises();
			expect(getByTestId('filter-status-stub')).toHaveTextContent('error');
		});
	});
});
