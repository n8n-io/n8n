/**
 * Work-volume guardrails for live sub-execution mirroring in the log view.
 *
 * Each live sub-execution costs one `copyRunData` of its run data per update,
 * and that copy drives a tree rebuild. Counting the copies catches the ways this
 * grows without looking any different in review: a copy per pair rather than per
 * sub-execution, and an update that runs when nothing changed.
 */
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createRunExecutionData, type IRunData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { nodeTypes } from '../__test__/data';

const { copyRunDataSpy } = vi.hoisted(() => ({ copyRunDataSpy: vi.fn() }));

vi.mock('@/features/execution/logs/logs.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/execution/logs/logs.utils')>();
	return {
		...actual,
		copyRunData: (...args: Parameters<typeof actual.copyRunData>) => {
			copyRunDataSpy();
			return actual.copyRunData(...args);
		},
	};
});

vi.mock('@n8n/composables/useToast');

// Imported after the mock so the composable picks up the wrapped `copyRunData`.
const { useLogsExecutionData } = await import('./useLogsExecutionData');

const PARENT_EXECUTION_ID = 'e-parent';
const SUB_WORKFLOW_ID = 'w-sub';
const SUB_NODE = 'Sub Step';

describe('live sub-execution work volume', () => {
	let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

	beforeEach(() => {
		copyRunDataSpy.mockClear();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		setActivePinia(createTestingPinia({ stubActions: false }));

		mockedStore(useNodeTypesStore).setNodeTypes(nodeTypes);
		mockedStore(useWorkflowsListStore).fetchWorkflow.mockResolvedValue(
			createTestWorkflow({ id: SUB_WORKFLOW_ID, nodes: [createTestNode({ name: SUB_NODE })] }),
		);
		mockedStore(useWorkflowsStore);
		useWorkflowDocumentStore(createWorkflowDocumentId(''));
		executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(''));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Puts the parent run on screen, with one run entry per calling node. */
	function setParentRun(callerNodes: string[], taskCount = 1) {
		const runData: IRunData = {};
		for (const name of callerNodes) {
			runData[name] = Array.from({ length: taskCount }, () => createTestTaskData());
		}

		executionStateStore.setWorkflowExecutionData(
			createTestWorkflowExecutionResponse({
				id: PARENT_EXECUTION_ID,
				status: 'running',
				workflowData: createTestWorkflow({
					id: 'w-parent',
					nodes: callerNodes.map((name) => createTestNode({ name })),
				}),
				data: createRunExecutionData({ resultData: { runData } }),
			}),
		);
		executionStateStore.setActiveExecutionId(PARENT_EXECUTION_ID);
	}

	/** The registry keeps one sub-execution per calling node, so each needs its own. */
	function registerLink(executionId: string, callerNode: string) {
		executionStateStore.registerSubExecution({
			executionId,
			workflowId: SUB_WORKFLOW_ID,
			parentExecutionId: PARENT_EXECUTION_ID,
			parentNodeName: callerNode,
			parentNodeRunIndex: 0,
		});
	}

	/** Registers a live sub-execution and gives it run data to mirror. */
	function addLiveSubExecution(executionId: string, callerNode: string) {
		registerLink(executionId, callerNode);

		useExecutionDataStore(createExecutionDataId(executionId)).setExecution(
			createTestWorkflowExecutionResponse({
				id: executionId,
				status: 'running',
				workflowData: createTestWorkflow({
					id: SUB_WORKFLOW_ID,
					nodes: [createTestNode({ name: SUB_NODE })],
				}),
				data: createRunExecutionData({
					resultData: { runData: { [SUB_NODE]: [createTestTaskData()] } },
				}),
			}),
		);
	}

	/**
	 * Reports one more node result for a sub-execution. Time has to move so the
	 * store's update stamp changes and the throttled watcher sees a new signature.
	 */
	function reportSubExecutionProgress(executionId: string, taskCount: number) {
		vi.advanceTimersByTime(50);
		useExecutionDataStore(createExecutionDataId(executionId)).setExecutionRunData(
			createRunExecutionData({
				resultData: {
					runData: { [SUB_NODE]: Array.from({ length: taskCount }, () => createTestTaskData()) },
				},
			}),
		);
	}

	async function settle() {
		vi.advanceTimersByTime(2000);
		await waitAllPromises();
	}

	it('copies run data once per live sub-execution, not once per pair', async () => {
		setParentRun(['Caller A', 'Caller B', 'Caller C']);
		addLiveSubExecution('e-sub-1', 'Caller A');
		addLiveSubExecution('e-sub-2', 'Caller B');
		addLiveSubExecution('e-sub-3', 'Caller C');

		const { entries } = useLogsExecutionData();
		// The first pass only requests the sub-workflow graph, so copying starts on
		// the pass after it resolves.
		await settle();
		copyRunDataSpy.mockClear();

		reportSubExecutionProgress('e-sub-1', 2);
		await settle();

		// Proves the copies were reached, so the count below is not a false zero.
		expect(entries.value.flatMap((entry) => entry.children)).not.toHaveLength(0);
		expect(copyRunDataSpy).toHaveBeenCalledTimes(3);
	});

	it('does not copy run data again when no sub-execution changed', async () => {
		setParentRun(['Caller A']);
		addLiveSubExecution('e-sub-1', 'Caller A');

		useLogsExecutionData();
		await settle();
		reportSubExecutionProgress('e-sub-1', 2);
		await settle();
		expect(copyRunDataSpy).toHaveBeenCalled();

		copyRunDataSpy.mockClear();
		await settle();
		await settle();

		expect(copyRunDataSpy).not.toHaveBeenCalled();
	});

	it('does not copy run data when a sub-execution re-registers with no new data', async () => {
		setParentRun(['Caller A']);
		addLiveSubExecution('e-sub-1', 'Caller A');

		useLogsExecutionData();
		await settle();
		reportSubExecutionProgress('e-sub-1', 2);
		await settle();
		expect(copyRunDataSpy).toHaveBeenCalled();

		copyRunDataSpy.mockClear();
		// A repeated executionStarted push re-registers a link we already hold, which
		// rebuilds the link list without changing what it says.
		registerLink('e-sub-1', 'Caller A');
		await settle();

		expect(copyRunDataSpy).not.toHaveBeenCalled();
	});

	it('does not copy run data for a run with no sub-executions', async () => {
		setParentRun(['Caller A']);

		useLogsExecutionData();
		await settle();

		// A parent-only run reporting progress must not start paying for this.
		for (let taskCount = 2; taskCount < 5; taskCount++) {
			vi.advanceTimersByTime(50);
			setParentRun(['Caller A'], taskCount);
			await settle();
		}

		expect(copyRunDataSpy).not.toHaveBeenCalled();
	});
});
