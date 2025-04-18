import { renderComponent } from '@/__tests__/render';
import LogsOverviewPanel from './LogsOverviewPanel.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createRouter, createWebHistory } from 'vue-router';
import { h } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import {
	aiChatExecutionResponse,
	aiChatWorkflow,
	aiManualExecutionResponse,
	aiManualWorkflow,
} from '../../__test__/data';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useNDVStore } from '@/stores/ndv.store';
import { createLogEntries } from '@/components/RunDataAi/utils';

describe('LogsOverviewPanel', () => {
	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let pushConnectionStore: ReturnType<typeof mockedStore<typeof usePushConnectionStore>>;
	let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;

	function render(props: Partial<InstanceType<typeof LogsOverviewPanel>['$props']>) {
		const mergedProps: InstanceType<typeof LogsOverviewPanel>['$props'] = {
			isOpen: false,
			isReadOnly: false,
			isCompact: false,
			executionTree: createLogEntries(
				workflowsStore.getCurrentWorkflow(),
				workflowsStore.workflowExecutionData?.data?.resultData.runData ?? {},
			),
			...props,
		};

		return renderComponent(LogsOverviewPanel, {
			props: mergedProps,
			global: {
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: () => h('div') }],
					}),
					pinia,
				],
			},
		});
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData(null);

		pushConnectionStore = mockedStore(usePushConnectionStore);
		pushConnectionStore.isConnected = true;

		ndvStore = mockedStore(useNDVStore);
	});

	it('should not render body if the panel is not open', () => {
		const rendered = render({ isOpen: false });

		expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument();
	});

	it('should render empty text if there is no execution', () => {
		const rendered = render({ isOpen: true });

		expect(rendered.queryByTestId('logs-overview-empty')).toBeInTheDocument();
	});

	it('should render summary text and executed nodes if there is an execution', async () => {
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render({ isOpen: true });
		const summary = within(rendered.container.querySelector('.summary')!);

		expect(summary.queryByText('Success in 1.999s')).toBeInTheDocument();
		expect(summary.queryByText('555 Tokens')).toBeInTheDocument();

		const tree = within(rendered.getByRole('tree'));

		expect(tree.queryAllByRole('treeitem')).toHaveLength(2);

		const row1 = within(tree.queryAllByRole('treeitem')[0]);

		expect(row1.queryByText('AI Agent')).toBeInTheDocument();
		expect(row1.queryByText('Success in 1.778s')).toBeInTheDocument();
		expect(row1.queryByText('Started 00:00:00.002, 26 Mar')).toBeInTheDocument();
		expect(row1.queryByText('555 Tokens')).toBeInTheDocument();

		const row2 = within(tree.queryAllByRole('treeitem')[1]);

		expect(row2.queryByText('AI Model')).toBeInTheDocument();
		expect(row2.queryByText('Error')).toBeInTheDocument();
		expect(row2.queryByText('in 1.777s')).toBeInTheDocument();
		expect(row2.queryByText('Started 00:00:00.003, 26 Mar')).toBeInTheDocument();
		expect(row2.queryByText('555 Tokens')).toBeInTheDocument();

		// collapse tree
		await fireEvent.click(row1.getAllByLabelText('Toggle row')[0]);
		await waitFor(() => expect(tree.queryAllByRole('treeitem')).toHaveLength(1));
	});

	it('should open NDV if the button is clicked', async () => {
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render({ isOpen: true });
		const aiAgentRow = rendered.getAllByRole('treeitem')[0];

		await fireEvent.click(within(aiAgentRow).getAllByLabelText('Open...')[0]);

		await waitFor(() => expect(ndvStore.activeNodeName).toBe('AI Agent'));
	});

	it('should trigger partial execution if the button is clicked', async () => {
		workflowsStore.setWorkflow(aiManualWorkflow);
		workflowsStore.setWorkflowExecutionData(aiManualExecutionResponse);

		const spyRun = vi.spyOn(workflowsStore, 'runWorkflow');

		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render({ isOpen: true });
		const aiAgentRow = rendered.getAllByRole('treeitem')[0];
		await fireEvent.click(within(aiAgentRow).getAllByLabelText('Test step')[0]);
		await waitFor(() =>
			expect(spyRun).toHaveBeenCalledWith(expect.objectContaining({ destinationNode: 'AI Agent' })),
		);
	});
});
