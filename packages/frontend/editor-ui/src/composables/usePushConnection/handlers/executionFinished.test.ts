import type { WorkflowState } from '@/composables/useWorkflowState';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import type { ITaskData } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import {
	continueEvaluationLoop,
	executionFinished,
	type SimplifiedExecution,
} from './executionFinished';

const opts = {
	workflowState: mock<WorkflowState>(),
	router: mock<Router>(),
};

const runWorkflow = vi.fn();

vi.mock('@/composables/useRunWorkflow', () => ({
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
});
