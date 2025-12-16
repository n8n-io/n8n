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
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { Router } from 'vue-router';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';

const opts = {
	workflowState: mock<WorkflowState>(),
	router: mock<Router>(),
};

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
		const workflowState = mock<WorkflowState>({
			executingNode: {
				lastAddedExecutingNode: 'test-node',
			},
		});
		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '1',
					workflowId: '1',
					status: 'success',
				},
			},
			{
				router: mock<Router>(),
				workflowState,
			},
		);

		expect(workflowState.executingNode.lastAddedExecutingNode).toBeNull();
	});

	describe('ready-to-run AI workflow tracking', () => {
		it('should track successful execution of ready-to-run-ai-workflow', async () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const workflowsStore = useWorkflowsStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			const workflowState = mock<WorkflowState>({
				executingNode: {
					lastAddedExecutingNode: null,
				},
			});

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				{
					router: mock<Router>(),
					workflowState,
				},
			);

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track failed execution of ready-to-run-ai-workflow', async () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const workflowsStore = useWorkflowsStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			const workflowState = mock<WorkflowState>({
				executingNode: {
					lastAddedExecutingNode: null,
				},
			});

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'error',
					},
				},
				{
					router: mock<Router>(),
					workflowState,
				},
			);

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('error');
		});

		it('should track execution of ready-to-run-ai-workflow-v1', async () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const workflowsStore = useWorkflowsStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v1' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			const workflowState = mock<WorkflowState>({
				executingNode: {
					lastAddedExecutingNode: null,
				},
			});

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				{
					router: mock<Router>(),
					workflowState,
				},
			);

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track execution of ready-to-run-ai-workflow-v4', async () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const workflowsStore = useWorkflowsStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v4' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			const workflowState = mock<WorkflowState>({
				executingNode: {
					lastAddedExecutingNode: null,
				},
			});

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'canceled',
					},
				},
				{
					router: mock<Router>(),
					workflowState,
				},
			);

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('canceled');
		});

		it('should not track execution for non-ready-to-run workflows', async () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const workflowsStore = useWorkflowsStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'some-other-template' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);
			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			const workflowState = mock<WorkflowState>({
				executingNode: {
					lastAddedExecutingNode: null,
				},
			});

			await executionFinished(
				{
					type: 'executionFinished',
					data: {
						executionId: '123',
						workflowId: '1',
						status: 'success',
					},
				},
				{
					router: mock<Router>(),
					workflowState,
				},
			);

			expect(trackExecuteAiWorkflowSuccess).not.toHaveBeenCalled();
			expect(trackExecuteAiWorkflow).not.toHaveBeenCalled();
		});
	});

	it('should return early and clear active execution when fetchExecutionData returns undefined', async () => {
		const pinia = createTestingPinia({
			initialState: {
				workflows: {
					activeExecutionId: '123',
				},
			},
		});

		setActivePinia(pinia);

		const workflowsStore = mockedStore(useWorkflowsStore);
		const uiStore = mockedStore(useUIStore);

		// Set activeExecutionId directly on the store
		workflowsStore.activeExecutionId = '123';

		// Mock getWorkflowById to return a workflow
		vi.spyOn(workflowsStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
		} as unknown as ReturnType<typeof workflowsStore.getWorkflowById>);

		vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(null);

		const setProcessingExecutionResultsSpy = vi.spyOn(uiStore, 'setProcessingExecutionResults');

		const workflowState = mock<WorkflowState>({
			executingNode: {
				lastAddedExecutingNode: 'test-node',
			},
			setActiveExecutionId: vi.fn(),
		});

		await executionFinished(
			{
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'error',
				},
			},
			{
				router: mock<Router>(),
				workflowState,
			},
		);

		// Verify that setActiveExecutionId was called with undefined
		expect(workflowState.setActiveExecutionId).toHaveBeenCalledWith(undefined);

		// Verify that processing was set to false
		expect(setProcessingExecutionResultsSpy).toHaveBeenCalledWith(false);

		expect(runWorkflow).not.toHaveBeenCalled();
	});
});

describe('manual execution stats tracking', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('handleExecutionFinishedWithSuccessOrOther', () => {
		it('increments success stats on successful execution', () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(mock<WorkflowState>(), 'success', false);

			expect(incrementSpy).toHaveBeenCalledWith('success');
		});

		it('does not increment success stats when successToastAlreadyShown is true', () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(mock<WorkflowState>(), 'success', true);

			expect(incrementSpy).not.toHaveBeenCalled();
		});

		it('does not increment stats for non-success status', () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther(mock<WorkflowState>(), 'error', false);

			expect(incrementSpy).not.toHaveBeenCalled();
		});
	});

	describe('handleExecutionFinishedWithErrorOrCanceled', () => {
		it('increments error stats on execution error', () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

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
			);

			expect(incrementSpy).toHaveBeenCalledWith('error');
		});

		it('does not increment stats for canceled executions', () => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			const execution = mock<SimplifiedExecution>({
				status: 'canceled',
			});

			handleExecutionFinishedWithErrorOrCanceled(
				execution,
				mock<IRunExecutionData>({ resultData: {} }),
			);

			expect(incrementSpy).not.toHaveBeenCalled();
		});
	});
});
