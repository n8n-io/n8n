import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
	continueEvaluationLoop,
	executionFinished,
	getRunExecutionData,
	handleExecutionFinishedWithSuccessOrOther,
	handleExecutionFinishedWithErrorOrCanceled,
	type SimplifiedExecution,
} from './executionFinished';
import type { IRunExecutionData, ITaskData, INodeTypeDescription } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import type { PushHandlerOptions } from './types';

const documentId = createWorkflowDocumentId('1');
const opts: PushHandlerOptions = {
	router: mock<Router>(),
	documentId,
};

const mockShowMessage = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		setDocumentTitle: vi.fn(),
	}),
}));

const runWorkflow = vi.fn();

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: vi.fn(() => ({
		runWorkflow,
	})),
}));

describe('continueEvaluationLoop()', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should call runWorkflow() if workflow has eval trigger that executed successfully with rows left', () => {
		setActivePinia(createTestingPinia());

		const evalTriggerNodeName = 'eval-trigger';
		const evalTriggerNodeData = mock<ITaskData>({
			data: {
				main: [
					[
						{
							json: {
								row_number: 1,
								_rowsLeft: 1,
								header1: 'value1',
							},
						},
					],
				],
			},
		});
		const execution = mock<SimplifiedExecution>({
			status: 'success',
			workflowData: {
				nodes: [
					mock<INodeUi>({
						type: EVALUATION_TRIGGER_NODE_TYPE,
						name: evalTriggerNodeName,
					}),
				],
			},
			data: {
				resultData: {
					runData: {
						[evalTriggerNodeName]: [evalTriggerNodeData],
					},
				},
			},
		});

		continueEvaluationLoop(execution, opts);

		expect(runWorkflow).toHaveBeenCalledWith({
			triggerNode: evalTriggerNodeName,
			nodeData: evalTriggerNodeData,
			rerunTriggerNode: true,
		});
		// The rerun must be bound to the document whose execution just finished (not the
		// globally-current workflow) so it serializes and saves the correct workflow.
		const runWorkflowOptions = vi.mocked(useRunWorkflow).mock.calls.at(-1)?.[0];
		expect(runWorkflowOptions?.workflowDocumentStore?.value.documentId).toBe(documentId);
	});

	it('should not call runWorkflow() if workflow execution status is not success', () => {
		const execution = mock<SimplifiedExecution>({
			status: 'error',
			workflowData: {
				nodes: [
					mock<INodeUi>({
						type: EVALUATION_TRIGGER_NODE_TYPE,
						name: 'eval-trigger',
					}),
				],
			},
			data: {
				resultData: {
					runData: {},
				},
			},
		});

		continueEvaluationLoop(execution, opts);

		expect(runWorkflow).not.toHaveBeenCalled();
	});

	it('should not call runWorkflow() if eval trigger node does not exist in workflow', () => {
		const execution = mock<SimplifiedExecution>({
			status: 'success',
			workflowData: {
				nodes: [],
			},
			data: {
				resultData: {
					runData: {},
				},
			},
		});

		continueEvaluationLoop(execution, opts);

		expect(runWorkflow).not.toHaveBeenCalled();
	});

	it('should not call runWorkflow() if eval trigger node exists but has no run data', () => {
		const evalTriggerNodeName = 'eval-trigger';
		const execution = mock<SimplifiedExecution>({
			status: 'success',
			workflowData: {
				nodes: [
					mock<INodeUi>({
						type: EVALUATION_TRIGGER_NODE_TYPE,
						name: evalTriggerNodeName,
					}),
				],
			},
			data: {
				resultData: {
					runData: {},
				},
			},
		});

		continueEvaluationLoop(execution, opts);

		expect(runWorkflow).not.toHaveBeenCalled();
	});

	it('should not call runWorkflow() if eval trigger node run data has no rows left', () => {
		const evalTriggerNodeName = 'eval-trigger';
		const evalTriggerNodeData = mock<ITaskData>({
			data: {
				main: [
					[
						{
							json: {
								row_number: 1,
								_rowsLeft: 0,
								header1: 'value1',
							},
						},
					],
				],
			},
		});
		const execution = mock<SimplifiedExecution>({
			status: 'success',
			workflowData: {
				nodes: [
					mock<INodeUi>({
						type: EVALUATION_TRIGGER_NODE_TYPE,
						name: evalTriggerNodeName,
					}),
				],
			},
			data: {
				resultData: {
					runData: {
						[evalTriggerNodeName]: [evalTriggerNodeData],
					},
				},
			},
		});

		continueEvaluationLoop(execution, opts);

		expect(runWorkflow).not.toHaveBeenCalled();
	});
});

describe('getRunExecutionData()', () => {
	it('should preserve pushRef from execution data', () => {
		const execution = mock<SimplifiedExecution>({
			data: {
				pushRef: 'test-push-ref-12345',
				resultData: {
					runData: {},
				},
			},
		});

		const result = getRunExecutionData(execution);

		expect(result.pushRef).toBe('test-push-ref-12345');
	});

	it('should handle missing pushRef gracefully', () => {
		const execution = mock<SimplifiedExecution>({
			data: {
				resultData: {
					runData: {},
				},
			},
		});

		const result = getRunExecutionData(execution);

		expect(result.pushRef).toBeUndefined();
	});
});

describe('executionFinished', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	it('should clear lastAddedExecutingNode when execution is finished', async () => {
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		workflowExecutionStateStore.executingNode.lastAddedExecutingNode = 'test-node';

		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '1',
					workflowId: '1',
					status: 'success',
				},
			},
			opts,
		);

		expect(workflowExecutionStateStore.executingNode.lastAddedExecutingNode).toBeNull();
	});

	describe('ready-to-run AI workflow tracking', () => {
		it('should track successful execution of ready-to-run-ai-workflow', async () => {
			setActivePinia(createTestingPinia());

			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(
				useWorkflowExecutionStateStore(documentId),
				'activeExecutionId',
				'get',
			).mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				opts,
			);

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track failed execution of ready-to-run-ai-workflow', async () => {
			setActivePinia(createTestingPinia());

			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(
				useWorkflowExecutionStateStore(documentId),
				'activeExecutionId',
				'get',
			).mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'error',
					},
				},
				opts,
			);

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('error');
		});

		it('should track execution of ready-to-run-ai-workflow-v5', async () => {
			setActivePinia(createTestingPinia());

			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(
				useWorkflowExecutionStateStore(documentId),
				'activeExecutionId',
				'get',
			).mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v5' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				opts,
			);

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track execution of ready-to-run-ai-workflow-v6', async () => {
			setActivePinia(createTestingPinia());

			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(
				useWorkflowExecutionStateStore(documentId),
				'activeExecutionId',
				'get',
			).mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v6' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'canceled',
					},
				},
				opts,
			);

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('canceled');
		});

		it('should not track execution for non-ready-to-run workflows', async () => {
			setActivePinia(createTestingPinia());

			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(
				useWorkflowExecutionStateStore(documentId),
				'activeExecutionId',
				'get',
			).mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'some-other-template' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);
			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				opts,
			);

			expect(trackExecuteAiWorkflowSuccess).not.toHaveBeenCalled();
			expect(trackExecuteAiWorkflow).not.toHaveBeenCalled();
		});
	});

	it('should set active execution id to undefined when execution data is not stored', async () => {
		setActivePinia(createTestingPinia());

		const workflowsListStore = mockedStore(useWorkflowsListStore);
		const uiStore = mockedStore(useUIStore);
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue('123');

		vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
		} as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>);

		vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById').mockResolvedValue(null);

		const setProcessingExecutionResultsSpy = vi.spyOn(uiStore, 'setProcessingExecutionResults');

		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'error',
				},
			},
			opts,
		);

		// Verify that setActiveExecutionId was called with undefined
		expect(workflowExecutionStateStore.setActiveExecutionId).toHaveBeenCalledWith(undefined);

		// Verify that processing was set to false
		expect(setProcessingExecutionResultsSpy).toHaveBeenCalledWith(false);

		expect(runWorkflow).not.toHaveBeenCalled();
	});

	it('should clear executing node queue even when fetchExecutionData returns undefined', async () => {
		setActivePinia(createTestingPinia());

		const workflowsListStore = mockedStore(useWorkflowsListStore);
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const clearNodeExecutionQueue = vi.spyOn(
			workflowExecutionStateStore.executingNode,
			'clearNodeExecutionQueue',
		);

		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue('123');

		vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
		} as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>);

		// Simulate the iframe scenario: fetch returns no data
		vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById').mockResolvedValue(null);

		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'success',
				},
			},
			opts,
		);

		// The executing node queue must be cleared so nodes don't stay stuck
		// with a spinner after the execution finishes.
		expect(clearNodeExecutionQueue).toHaveBeenCalled();
	});

	it('should clear executing node queue when activeExecutionId is undefined (iframe preview)', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const clearNodeExecutionQueue = vi.spyOn(
			workflowExecutionStateStore.executingNode,
			'clearNodeExecutionQueue',
		);
		// In iframe preview after resetWorkspace, activeExecutionId is undefined by default.

		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'success',
				},
			},
			opts,
		);

		// Even when activeExecutionId is undefined (iframe early return),
		// the executing node queue must be cleared.
		expect(clearNodeExecutionQueue).toHaveBeenCalled();
	});

	it('ignores a finish for an execution this document is not tracking', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const workflowsStore = useWorkflowsStore();
		// This document is tracking a different execution (e.g. a concurrent
		// scheduled run of the same workflow finished). Even though the workflow id
		// matches, the finish must not clear this document's active execution nor its
		// per-node spinner queue.
		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue('our-exec');
		workflowExecutionStateStore.executingNode.lastAddedExecutingNode = 'busy-node';
		const clearNodeExecutionQueue = vi.spyOn(
			workflowExecutionStateStore.executingNode,
			'clearNodeExecutionQueue',
		);
		const fetchSpy = vi.spyOn(workflowsStore, 'fetchExecutionDataById');

		await executionFinished(
			{
				type: 'executionFinished',
				data: { executionId: 'foreign-exec', workflowId: '1', status: 'success' },
			},
			opts,
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(workflowExecutionStateStore.setActiveExecutionId).not.toHaveBeenCalled();
		expect(clearNodeExecutionQueue).not.toHaveBeenCalled();
		expect(workflowExecutionStateStore.executingNode.lastAddedExecutingNode).toBe('busy-node');
	});

	it('processes a pending finish (null active) when the workflow id matches', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const workflowsStore = useWorkflowsStore();
		// The finish raced ahead of executionStarted: active is still pending (null).
		// Fall back to the workflow id so our own run's finish isn't dropped.
		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue(null);
		const fetchSpy = vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(null);

		await executionFinished(
			{
				type: 'executionFinished',
				data: { executionId: 'exec-x', workflowId: '1', status: 'error' },
			},
			opts,
		);

		expect(fetchSpy).toHaveBeenCalledWith('exec-x');
	});

	it('processes a late finish for the execution this document just stopped', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const workflowsStore = useWorkflowsStore();
		// The stop poll already cleared the active id (the stop endpoint persists
		// `canceled` before the scaling-mode worker aborts), so the worker's late
		// finish only matches via the stopped-execution marker. It must still be
		// processed so trimmed run-data placeholders get backfilled from the API.
		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue(undefined);
		vi.spyOn(workflowExecutionStateStore, 'stoppedExecutionId', 'get').mockReturnValue(
			'stopped-exec',
		);
		const fetchSpy = vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(null);

		await executionFinished(
			{
				type: 'executionFinished',
				data: { executionId: 'stopped-exec', workflowId: '1', status: 'canceled' },
			},
			opts,
		);

		// The marker is consumed before processing so a duplicate push is inert.
		expect(workflowExecutionStateStore.clearStoppedExecutionId).toHaveBeenCalled();
		expect(fetchSpy).toHaveBeenCalledWith('stopped-exec');
	});

	it('ignores a finish that does not match the stopped-execution marker', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const workflowsStore = useWorkflowsStore();
		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue(undefined);
		vi.spyOn(workflowExecutionStateStore, 'stoppedExecutionId', 'get').mockReturnValue(
			'stopped-exec',
		);
		const fetchSpy = vi.spyOn(workflowsStore, 'fetchExecutionDataById');

		await executionFinished(
			{
				type: 'executionFinished',
				data: { executionId: 'foreign-exec', workflowId: '1', status: 'success' },
			},
			opts,
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(workflowExecutionStateStore.clearStoppedExecutionId).not.toHaveBeenCalled();
	});

	it('does not let a stale stopped-execution marker hijack a newer run', async () => {
		setActivePinia(createTestingPinia());

		const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
		const workflowsStore = useWorkflowsStore();
		// A new run is being tracked; the old stopped execution's late finish must
		// be dropped (processing it would clear the new run's tracking).
		vi.spyOn(workflowExecutionStateStore, 'activeExecutionId', 'get').mockReturnValue('new-exec');
		vi.spyOn(workflowExecutionStateStore, 'stoppedExecutionId', 'get').mockReturnValue('old-exec');
		const fetchSpy = vi.spyOn(workflowsStore, 'fetchExecutionDataById');

		await executionFinished(
			{
				type: 'executionFinished',
				data: { executionId: 'old-exec', workflowId: '1', status: 'canceled' },
			},
			opts,
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(workflowExecutionStateStore.clearStoppedExecutionId).not.toHaveBeenCalled();
		expect(workflowExecutionStateStore.setActiveExecutionId).not.toHaveBeenCalled();
	});
});

describe('manual execution stats tracking', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('handleExecutionFinishedWithSuccessOrOther', () => {
		it('increments success stats on successful execution', () => {
			setActivePinia(createTestingPinia());

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'success', false);

			expect(incrementSpy).toHaveBeenCalledWith('success');
		});

		it('does not increment success stats when successToastAlreadyShown is true', () => {
			setActivePinia(createTestingPinia());

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'success', true);

			expect(incrementSpy).not.toHaveBeenCalled();
		});

		it('does not increment stats for non-success status', () => {
			setActivePinia(createTestingPinia());

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'error', false);

			expect(incrementSpy).not.toHaveBeenCalled();
		});
	});

	describe('toast messages', () => {
		beforeEach(() => {
			mockShowMessage.mockClear();
		});

		it('shows success toast when executed node has run data', () => {
			setActivePinia(createTestingPinia());

			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeName = 'Send Telegram';
			vi.spyOn(workflowsStore, 'getWorkflowExecution', 'get').mockReturnValue({
				executedNode: nodeName,
				data: {
					resultData: {
						runData: {
							[nodeName]: [mock<ITaskData>()],
						},
					},
				},
			} as unknown as IExecutionResponse);

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(''));
			workflowDocumentStore.setNodes([
				mock<INodeUi>({ name: nodeName, type: 'n8n-nodes-base.telegram', typeVersion: 1 }),
			]);

			nodeTypesStore.getNodeType = () =>
				mock<INodeTypeDescription>({ polling: undefined, group: [] });

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'success', false);

			expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('shows warning toast when executed node was not reached', () => {
			setActivePinia(createTestingPinia());

			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeName = 'Send a text message';
			vi.spyOn(workflowsStore, 'getWorkflowExecution', 'get').mockReturnValue({
				executedNode: nodeName,
				data: {
					resultData: {
						runData: {},
					},
				},
			} as unknown as IExecutionResponse);

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(''));
			workflowDocumentStore.setNodes([
				mock<INodeUi>({ name: nodeName, type: 'n8n-nodes-base.vonage', typeVersion: 1 }),
			]);

			nodeTypesStore.getNodeType = () =>
				mock<INodeTypeDescription>({ polling: undefined, group: [] });

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'success', false);

			expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('does not show warning toast when successToastAlreadyShown is true', () => {
			setActivePinia(createTestingPinia());

			const workflowsStore = mockedStore(useWorkflowsStore);
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const nodeName = 'Send a text message';
			vi.spyOn(workflowsStore, 'getWorkflowExecution', 'get').mockReturnValue({
				executedNode: nodeName,
				data: {
					resultData: {
						runData: {},
					},
				},
			} as unknown as IExecutionResponse);

			const docStore2 = useWorkflowDocumentStore(createWorkflowDocumentId(''));
			docStore2.setNodes([
				mock<INodeUi>({ name: nodeName, type: 'n8n-nodes-base.vonage', typeVersion: 1 }),
			]);

			nodeTypesStore.getNodeType = () =>
				mock<INodeTypeDescription>({ polling: undefined, group: [] });

			handleExecutionFinishedWithSuccessOrOther(createWorkflowDocumentId(''), 'success', true);

			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('handleExecutionFinishedWithErrorOrCanceled', () => {
		it('increments error stats on execution error', () => {
			setActivePinia(createTestingPinia());

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			const execution = mock<SimplifiedExecution>({
				status: 'error',
				data: {
					resultData: {
						error: { message: 'test error', name: 'Error' },
					},
				},
			});

			handleExecutionFinishedWithErrorOrCanceled(
				execution,
				mock<IRunExecutionData>({ resultData: { error: { message: 'test', name: 'Error' } } }),
				createWorkflowDocumentId(''),
			);

			expect(incrementSpy).toHaveBeenCalledWith('error');
		});

		it('does not increment stats for canceled executions', () => {
			setActivePinia(createTestingPinia());

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			const execution = mock<SimplifiedExecution>({
				status: 'canceled',
			});

			handleExecutionFinishedWithErrorOrCanceled(
				execution,
				mock<IRunExecutionData>({ resultData: {} }),
				createWorkflowDocumentId(''),
			);

			expect(incrementSpy).not.toHaveBeenCalled();
		});
	});
});
