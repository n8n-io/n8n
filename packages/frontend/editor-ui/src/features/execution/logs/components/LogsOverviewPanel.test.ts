import { renderComponent } from '@/__tests__/render';
import LogsOverviewPanel from './LogsOverviewPanel.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createRouter, createWebHistory } from 'vue-router';
import { h } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import {
	aiChatExecutionResponse,
	aiChatWorkflow,
	aiManualExecutionResponse,
	aiManualWorkflow,
} from '../__test__/data';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { createLogTree, flattenLogEntries } from '../logs.utils';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const { mockDocumentStore } = vi.hoisted(() => ({
	mockDocumentStore: {
		workflowId: 'test-workflow-id',
		name: 'Test Workflow',
		allNodes: [],
		workflowTriggerNodes: [],
		getNodeByName: vi.fn(),
		getParentNodes: vi.fn().mockReturnValue([]),
		getChildNodes: vi.fn().mockReturnValue([]),
		getStartNode: vi.fn(),
		checkIfNodeHasChatParent: vi.fn().mockReturnValue(false),
		checkIfToolNodeHasChatParent: vi.fn().mockReturnValue(false),
		getExpressionHandler: vi.fn().mockReturnValue(null),
		getWorkflowObjectAccessorSnapshot: vi.fn().mockReturnValue({
			id: 'test-workflow-id',
			connectionsBySourceNode: {},
			pinData: {},
			expression: null,
			getNode: vi.fn(),
			getParentNodes: vi.fn().mockReturnValue([]),
			getNodeConnectionIndexes: vi.fn(),
			getParentMainInputNode: vi.fn(),
			getChildNodes: vi.fn().mockReturnValue([]),
			getParentNodesByDepth: vi.fn().mockReturnValue([]),
		}),
		documentId: 'test-workflow-id@latest',
		connectionsBySourceNode: {},
		pinnedDataByNodeName: {},
		incomingConnectionsByNodeName: vi.fn().mockReturnValue({}),
		outgoingConnectionsByNodeName: vi.fn().mockReturnValue({}),
		settings: {},
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		serialize: vi.fn().mockReturnValue({
			id: 'test-workflow-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			pinData: {},
			active: false,
			settings: {},
			tags: [],
			versionId: '',
			meta: {},
		}),
	} satisfies Partial<ReturnType<typeof useWorkflowDocumentStore>>,
}));

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal<{}>()),
	useWorkflowDocumentStore: () => mockDocumentStore,
}));

describe('LogsOverviewPanel', () => {
	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let pushConnectionStore: ReturnType<typeof mockedStore<typeof usePushConnectionStore>>;

	function render(props: Partial<InstanceType<typeof LogsOverviewPanel>['$props']>) {
		const logs = createLogTree(createTestWorkflowObject(aiChatWorkflow), aiChatExecutionResponse);
		const mergedProps: InstanceType<typeof LogsOverviewPanel>['$props'] = {
			isOpen: false,
			isReadOnly: false,
			isCompact: false,
			flatLogEntries: flattenLogEntries(logs, {}),
			entries: logs,
			latestNodeInfo: {},
			execution: aiChatExecutionResponse,
			isHeaderClickable: true,
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
		workflowsStore.setWorkflowId('test-workflow-id');

		pushConnectionStore = mockedStore(usePushConnectionStore);
		pushConnectionStore.isConnected = true;
	});

	it('should not render body if the panel is not open', () => {
		const rendered = render({ isOpen: false });

		expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument();
	});

	it('should render empty text if there is no execution', () => {
		const rendered = render({
			isOpen: true,
			flatLogEntries: [],
			entries: [],
			execution: undefined,
		});

		expect(rendered.queryByTestId('logs-overview-empty')).toBeInTheDocument();
	});

	it('should render a too-large message when the execution data was not loaded', () => {
		const rendered = render({
			isOpen: true,
			flatLogEntries: [],
			entries: [],
			execution: { ...aiChatExecutionResponse, dataTooLargeToDisplay: true },
		});

		expect(rendered.queryByTestId('logs-overview-empty')).toBeInTheDocument();
		expect(
			rendered.queryByText("This execution's data is too large to display."),
		).toBeInTheDocument();
	});

	it('should render summary text and executed nodes if there is an execution', async () => {
		const rendered = render({ isOpen: true });
		const summary = within(rendered.container.querySelector('.summary')!);

		expect(summary.queryByText('Success in 1.999s')).toBeInTheDocument();
		expect(summary.queryByText('555 Tokens')).toBeInTheDocument();

		await fireEvent.click(rendered.getByText('Overview'));

		const tree = within(rendered.getByRole('tree'));

		await waitFor(() => expect(tree.queryAllByRole('treeitem')).toHaveLength(2));

		const row1 = within(tree.queryAllByRole('treeitem')[0]);

		expect(row1.queryByText('AI Agent')).toBeInTheDocument();
		expect(row1.queryByText('Success')).toBeInTheDocument();
		expect(row1.queryByText('in 1.778s')).toBeInTheDocument();
		expect(row1.queryByText('Started 00:00:00.002, 26 Mar')).toBeInTheDocument();

		const row2 = within(tree.queryAllByRole('treeitem')[1]);

		expect(row2.queryByText('AI Model')).toBeInTheDocument();
		expect(row2.queryByText('Error')).toBeInTheDocument();
		expect(row2.queryByText('in 1.777s')).toBeInTheDocument();
		expect(row2.queryByText('Started 00:00:00.003, 26 Mar')).toBeInTheDocument();
		expect(row2.queryByText('555 Tokens')).toBeInTheDocument();
	});

	it('should render a canvas group as a group row with no node icon', async () => {
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'B', name: 'B' }),
				createTestNode({ id: 'C', name: 'C' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const execution = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
						B: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
						C: [createTestTaskData({ startTime: 2, executionIndex: 2 })],
					},
				},
			}),
		});
		const logs = createLogTree(workflow, execution, {}, {}, undefined, [
			{ id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] },
		]);
		const rendered = render({
			isOpen: true,
			execution,
			entries: logs,
			flatLogEntries: flattenLogEntries(logs, {}),
		});

		await fireEvent.click(rendered.getByText('Overview'));

		const tree = within(rendered.getByRole('tree'));
		const groupRow = await waitFor(() =>
			within(tree.getByText('My Group').closest('[role=treeitem]')!),
		);

		expect(groupRow.getByText('My Group')).toBeInTheDocument();
		// A group row has no node icon
		expect(groupRow.queryByRole('img')).not.toBeInTheDocument();
	});

	it('reflects a running member in the group row status', async () => {
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'B', name: 'B' }),
				createTestNode({ id: 'C', name: 'C' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const execution = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
						B: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
						C: [
							createTestTaskData({
								startTime: 2,
								executionIndex: 2,
								executionStatus: 'running',
								executionTime: 0,
							}),
						],
					},
				},
			}),
		});
		const logs = createLogTree(workflow, execution, {}, {}, undefined, [
			{ id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] },
		]);
		const rendered = render({
			isOpen: true,
			execution,
			entries: logs,
			flatLogEntries: flattenLogEntries(logs, {}),
		});

		await fireEvent.click(rendered.getByText('Overview'));

		const tree = within(rendered.getByRole('tree'));
		const groupRow = await waitFor(() =>
			within(tree.getByText('My Group').closest('[role=treeitem]')!),
		);

		expect(groupRow.queryByText('Running')).toBeInTheDocument();
		expect(groupRow.queryByText('Success')).not.toBeInTheDocument();
	});

	it('should trigger partial execution if the button is clicked', async () => {
		const spyRun = vi.spyOn(workflowsStore, 'runWorkflow');

		const logs = createLogTree(
			createTestWorkflowObject(aiManualWorkflow),
			aiManualExecutionResponse,
		);
		const rendered = render({
			isOpen: true,
			execution: aiManualExecutionResponse,
			entries: logs,
			flatLogEntries: flattenLogEntries(logs, {}),
		});
		const aiAgentRow = (await rendered.findAllByRole('treeitem'))[0];

		await fireEvent.click(within(aiAgentRow).getAllByLabelText('Execute step')[0]);
		await waitFor(() =>
			expect(spyRun).toHaveBeenCalledWith(
				expect.objectContaining({ destinationNode: { nodeName: 'AI Agent', mode: 'inclusive' } }),
			),
		);
	});
});
