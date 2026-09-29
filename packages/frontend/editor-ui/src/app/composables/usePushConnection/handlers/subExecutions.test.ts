/**
 * Live sub-execution mirroring, driven through the push handlers the way the
 * backend drives them: a workflow calling itself reports the sub-workflow under a
 * separate execution id, and the canvas has to light up for it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type {
	ExecutionFinished,
	ExecutionStarted,
	NodeExecuteAfter,
	NodeExecuteBefore,
	SubExecutionParent,
} from '@n8n/api-types/push/execution';
import { executionStarted } from './executionStarted';
import { executionFinished } from './executionFinished';
import { nodeExecuteBefore } from './nodeExecuteBefore';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import type { PushHandlerOptions } from './types';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createRunExecutionData, TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

const WORKFLOW_ID = 'wf-self';
const ROOT_EXECUTION_ID = 'exec-root';

// Trigger branch and sub-workflow branch of one self-calling workflow.
const CALLER_NODE = createTestNode({ id: 'id-caller', name: 'Execute Sub-workflow' });
const SUB_TRIGGER_NODE = createTestNode({ id: 'id-sub-trigger', name: 'Sub Trigger' });
const SUB_STEP_NODE = createTestNode({ id: 'id-sub-step', name: 'Sub Step' });

const documentId = createWorkflowDocumentId(WORKFLOW_ID);
let options: PushHandlerOptions;
let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

function subExecutionStartedEvent(
	executionId: string,
	parent: Partial<SubExecutionParent> = {},
	workflowId = WORKFLOW_ID,
): ExecutionStarted {
	return {
		type: 'executionStarted',
		data: {
			executionId,
			mode: 'integrated',
			startedAt: new Date(),
			workflowId,
			workflowName: 'self-calling',
			flattedRunData: '',
			parent: {
				executionId: ROOT_EXECUTION_ID,
				nodeName: CALLER_NODE.name,
				runIndex: 0,
				...parent,
			},
		},
	};
}

function nodeExecuteBeforeEvent(
	executionId: string,
	nodeName: string,
	sequenceNumber = 0,
): NodeExecuteBefore {
	return {
		type: 'nodeExecuteBefore',
		data: {
			executionId,
			nodeName,
			sequenceNumber,
			data: { startTime: 0, executionIndex: 0, source: [] },
		},
	};
}

function nodeExecuteAfterEvent(
	executionId: string,
	nodeName: string,
	sequenceNumber = 1,
): NodeExecuteAfter {
	return {
		type: 'nodeExecuteAfter',
		data: {
			executionId,
			nodeName,
			sequenceNumber,
			itemCountByConnectionType: { main: [1] },
			data: {
				startTime: 0,
				executionIndex: 0,
				executionTime: 1,
				executionStatus: 'success',
				source: [],
			},
		},
	};
}

function executionFinishedEvent(executionId: string): ExecutionFinished {
	return {
		type: 'executionFinished',
		data: { executionId, workflowId: WORKFLOW_ID, status: 'success' },
	};
}

/** What the REST API returns for the root run when its finish is processed. */
function rootExecutionResponse() {
	return createTestWorkflowExecutionResponse({
		id: ROOT_EXECUTION_ID,
		status: 'success',
		workflowData: createTestWorkflow({
			id: WORKFLOW_ID,
			nodes: [CALLER_NODE, SUB_TRIGGER_NODE, SUB_STEP_NODE],
		}),
	});
}

/** Runs the sub-workflow branch to completion under `executionId`. */
async function runSubWorkflowBranch(executionId: string) {
	await nodeExecuteBefore(nodeExecuteBeforeEvent(executionId, SUB_TRIGGER_NODE.name, 0), options);
	await nodeExecuteAfter(nodeExecuteAfterEvent(executionId, SUB_TRIGGER_NODE.name, 1), options);
	await nodeExecuteBefore(nodeExecuteBeforeEvent(executionId, SUB_STEP_NODE.name, 2), options);
	await nodeExecuteAfter(nodeExecuteAfterEvent(executionId, SUB_STEP_NODE.name, 3), options);
}

describe('live sub-executions', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		options = { router: mock<Router>(), documentId };

		const documentStore = useWorkflowDocumentStore(documentId);
		documentStore.setNodes([CALLER_NODE, SUB_TRIGGER_NODE, SUB_STEP_NODE]);

		executionStateStore = useWorkflowExecutionStateStore(documentId);
		useExecutionDataStore(createExecutionDataId(ROOT_EXECUTION_ID)).setExecution(
			createTestWorkflowExecutionResponse({
				id: ROOT_EXECUTION_ID,
				status: 'running',
				workflowData: createTestWorkflow({
					id: WORKFLOW_ID,
					nodes: [CALLER_NODE, SUB_TRIGGER_NODE, SUB_STEP_NODE],
				}),
			}),
		);
		executionStateStore.setActiveExecutionId(ROOT_EXECUTION_ID);
	});

	describe('registration', () => {
		it('registers a sub-execution of the tracked run', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);

			expect(executionStateStore.isTrackedSubExecution('exec-sub')).toBe(true);
			expect(executionStateStore.subExecutionLinks).toEqual([
				{
					executionId: 'exec-sub',
					workflowId: WORKFLOW_ID,
					parentExecutionId: ROOT_EXECUTION_ID,
					parentNodeName: CALLER_NODE.name,
					parentNodeRunIndex: 0,
				},
			]);
		});

		it('ignores a sub-execution whose parent is not the tracked run', async () => {
			await executionStarted(
				subExecutionStartedEvent('exec-sub', { executionId: 'someone-elses-run' }),
				options,
			);

			expect(executionStateStore.isTrackedSubExecution('exec-sub')).toBe(false);
		});

		it('registers a sub-execution nested inside another sub-execution', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await executionStarted(
				subExecutionStartedEvent('exec-grandchild', { executionId: 'exec-sub' }),
				options,
			);

			expect(executionStateStore.isTrackedSubExecution('exec-grandchild')).toBe(true);
		});

		it('does not take over the tracked run slots', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);

			expect(executionStateStore.activeExecutionId).toBe(ROOT_EXECUTION_ID);
			expect(executionStateStore.displayedExecutionId).toBe(ROOT_EXECUTION_ID);
		});
	});

	describe('canvas mirroring', () => {
		it('turns the sub-workflow branch green as its nodes finish', async () => {
			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'new',
			);

			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');

			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'success',
			);
			expect(
				executionStateStore.activeExecutionRunDataByNodeId.get(SUB_STEP_NODE.id)?.value,
			).toHaveLength(1);
			// The per-output aggregation feeding edge item counts is throttled.
			await vi.waitFor(() =>
				expect(
					executionStateStore.activeExecutionRunDataOutputMapByNodeId.get(SUB_STEP_NODE.id),
				).toBeDefined(),
			);
		});

		it('marks the sub-execution node as running while it is in flight', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await nodeExecuteBefore(nodeExecuteBeforeEvent('exec-sub', SUB_STEP_NODE.name), options);

			expect(executionStateStore.executionRunningByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(true);

			await nodeExecuteAfter(nodeExecuteAfterEvent('exec-sub', SUB_STEP_NODE.name), options);

			expect(executionStateStore.executionRunningByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(false);
		});

		it('keeps the node executing the sub-workflow running while the sub-execution advances', async () => {
			await nodeExecuteBefore(
				nodeExecuteBeforeEvent(ROOT_EXECUTION_ID, CALLER_NODE.name, 0),
				options,
			);
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await nodeExecuteBefore(nodeExecuteBeforeEvent('exec-sub', SUB_STEP_NODE.name, 0), options);

			expect(executionStateStore.executionRunningByNodeId.get(CALLER_NODE.id)?.value).toBe(true);
			expect(executionStateStore.executionRunningByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(true);
		});

		it("leaves the tracked run's own node state untouched", async () => {
			await nodeExecuteBefore(
				nodeExecuteBeforeEvent(ROOT_EXECUTION_ID, CALLER_NODE.name, 0),
				options,
			);
			await nodeExecuteAfter(
				nodeExecuteAfterEvent(ROOT_EXECUTION_ID, CALLER_NODE.name, 1),
				options,
			);
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');

			expect(executionStateStore.activeExecutionStatusByNodeId.get(CALLER_NODE.id)?.value).toBe(
				'success',
			);
			// The sub-execution's data lives in its own store, so it must not leak
			// into the run data the tracked execution reports.
			expect(Object.keys(executionStateStore.activeExecutionRunData ?? {}).sort()).toEqual([
				CALLER_NODE.name,
			]);
		});

		it('contributes nothing when the sub-workflow is a different workflow', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub', {}, 'wf-other'), options);
			await runSubWorkflowBranch('exec-sub');

			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'new',
			);
		});
	});

	describe('loops', () => {
		it('shows only the current iteration', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub-0', { runIndex: 0 }), options);
			await runSubWorkflowBranch('exec-sub-0');
			await executionFinished(executionFinishedEvent('exec-sub-0'), options);

			await executionStarted(subExecutionStartedEvent('exec-sub-1', { runIndex: 1 }), options);

			expect(executionStateStore.isTrackedSubExecution('exec-sub-0')).toBe(false);
			expect(executionStateStore.subExecutionLinks.map((l) => l.executionId)).toEqual([
				'exec-sub-1',
			]);
			// Superseded iteration's data is gone, so the branch reflects the current
			// one only — which has not run any node yet.
			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'new',
			);

			await runSubWorkflowBranch('exec-sub-1');

			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'success',
			);
		});

		it('drops the superseded iteration´s own sub-executions too', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub-0', { runIndex: 0 }), options);
			await executionStarted(
				subExecutionStartedEvent('exec-grandchild', { executionId: 'exec-sub-0' }),
				options,
			);

			await executionStarted(subExecutionStartedEvent('exec-sub-1', { runIndex: 1 }), options);

			expect(executionStateStore.isTrackedSubExecution('exec-grandchild')).toBe(false);
		});
	});

	describe('finishing', () => {
		it('does not end the tracked run when a sub-execution finishes', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');
			await executionFinished(executionFinishedEvent('exec-sub'), options);

			expect(executionStateStore.activeExecutionId).toBe(ROOT_EXECUTION_ID);
			// Its data stays on display, so the branch remains lit.
			expect(executionStateStore.activeExecutionStatusByNodeId.get(SUB_STEP_NODE.id)?.value).toBe(
				'success',
			);
		});

		it('settles the sub-execution status on its own store', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await executionFinished(executionFinishedEvent('exec-sub'), options);

			const subStore = useExecutionDataStore(createExecutionDataId('exec-sub'));
			expect(subStore.execution?.status).toBe('success');
			expect(subStore.execution?.finished).toBe(true);
		});

		it('clears the sub-execution running indicator when the run ends', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await nodeExecuteBefore(nodeExecuteBeforeEvent('exec-sub', SUB_STEP_NODE.name), options);
			expect(executionStateStore.subExecutingNode.executingNode).toEqual([SUB_STEP_NODE.name]);

			await executionFinished(executionFinishedEvent(ROOT_EXECUTION_ID), options);

			expect(executionStateStore.subExecutingNode.executingNode).toEqual([]);
		});
	});

	describe('backfilling item payloads', () => {
		/** Real run data as the REST API would return it for a sub-execution. */
		function fetchedSubExecution(value: string) {
			return createTestWorkflowExecutionResponse({
				id: 'exec-sub',
				status: 'success',
				data: createRunExecutionData({
					resultData: {
						runData: {
							[SUB_STEP_NODE.name]: [
								{
									startTime: 0,
									executionIndex: 0,
									executionTime: 1,
									executionStatus: 'success',
									source: [],
									data: { main: [[{ json: { value } }]] },
								},
							],
						},
					},
				}),
			});
		}

		it('replaces the placeholders once the tracked run finishes', async () => {
			const fetchSpy = vi
				.spyOn(useWorkflowsStore(), 'fetchExecutionDataById')
				.mockImplementation(async (id) =>
					id === 'exec-sub' ? fetchedSubExecution('real') : rootExecutionResponse(),
				);

			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');
			await executionFinished(executionFinishedEvent('exec-sub'), options);

			// Live pushes carry counts only, so the payload is a trimmed placeholder.
			const subStore = useExecutionDataStore(createExecutionDataId('exec-sub'));
			expect(
				subStore.execution?.data?.resultData.runData[SUB_STEP_NODE.name][0].data?.main[0]?.[0].json,
			).toHaveProperty(TRIMMED_TASK_DATA_CONNECTIONS_KEY);

			await executionFinished(executionFinishedEvent(ROOT_EXECUTION_ID), options);

			expect(fetchSpy).toHaveBeenCalledWith('exec-sub');
			expect(
				subStore.execution?.data?.resultData.runData[SUB_STEP_NODE.name][0].data?.main[0]?.[0].json,
			).toEqual({ value: 'real' });
		});

		it('costs one request per calling node, not per loop iteration', async () => {
			const fetchSpy = vi
				.spyOn(useWorkflowsStore(), 'fetchExecutionDataById')
				.mockImplementation(async (id) =>
					id === ROOT_EXECUTION_ID ? rootExecutionResponse() : fetchedSubExecution('real'),
				);

			// A loop over the same node: each iteration supersedes the previous one.
			for (const id of ['exec-sub-1', 'exec-sub-2', 'exec-sub-3']) {
				await executionStarted(subExecutionStartedEvent(id), options);
				await runSubWorkflowBranch(id);
				await executionFinished(executionFinishedEvent(id), options);
			}
			await executionFinished(executionFinishedEvent(ROOT_EXECUTION_ID), options);

			const subFetches = fetchSpy.mock.calls.filter(([id]) => id !== ROOT_EXECUTION_ID);
			expect(subFetches).toEqual([['exec-sub-3']]);
		});

		it('skips a sub-execution that has not finished yet', async () => {
			const fetchSpy = vi
				.spyOn(useWorkflowsStore(), 'fetchExecutionDataById')
				.mockResolvedValue(rootExecutionResponse());

			// "Wait for sub-workflow" off: the parent ends while the child runs on, so
			// fetching now would capture incomplete data.
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await executionFinished(executionFinishedEvent(ROOT_EXECUTION_ID), options);

			expect(fetchSpy.mock.calls.filter(([id]) => id === 'exec-sub')).toEqual([]);
		});

		it('backfills on the child finish when the parent run already ended', async () => {
			const fetchSpy = vi
				.spyOn(useWorkflowsStore(), 'fetchExecutionDataById')
				.mockImplementation(async (id) =>
					id === 'exec-sub' ? fetchedSubExecution('late') : rootExecutionResponse(),
				);

			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');
			await executionFinished(executionFinishedEvent(ROOT_EXECUTION_ID), options);
			expect(fetchSpy.mock.calls.filter(([id]) => id === 'exec-sub')).toEqual([]);

			await executionFinished(executionFinishedEvent('exec-sub'), options);

			const subStore = useExecutionDataStore(createExecutionDataId('exec-sub'));
			expect(
				subStore.execution?.data?.resultData.runData[SUB_STEP_NODE.name][0].data?.main[0]?.[0].json,
			).toEqual({ value: 'late' });
		});
	});

	describe('cleanup', () => {
		it('forgets sub-executions when a new run starts', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await runSubWorkflowBranch('exec-sub');

			executionStateStore.setWorkflowExecutionData(null);

			expect(executionStateStore.isTrackedSubExecution('exec-sub')).toBe(false);
			expect(executionStateStore.subExecutionLinks).toEqual([]);
		});

		it('forgets sub-executions on reset', async () => {
			await executionStarted(subExecutionStartedEvent('exec-sub'), options);

			executionStateStore.resetExecutionState();

			expect(executionStateStore.isTrackedSubExecution('exec-sub')).toBe(false);
		});
	});

	describe('side effects', () => {
		it('does not report a sub-execution node to workflow-scoped telemetry', async () => {
			const telemetry = await import('./trackNodeExecution');
			const spy = vi.spyOn(telemetry, 'trackNodeExecution');

			await executionStarted(subExecutionStartedEvent('exec-sub'), options);
			await nodeExecuteAfter(nodeExecuteAfterEvent('exec-sub', SUB_STEP_NODE.name), options);

			expect(spy).not.toHaveBeenCalled();
		});
	});
});
