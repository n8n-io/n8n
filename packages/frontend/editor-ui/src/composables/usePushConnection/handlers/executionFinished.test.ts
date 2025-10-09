import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
	continueEvaluationLoop,
	executionFinished,
	type SimplifiedExecution,
} from './executionFinished';
import type { ITaskData } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { Router } from 'vue-router';
import type { WorkflowState } from '@/composables/useWorkflowState';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

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

		continueEvaluationLoop(execution, mock<Router>());

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

		continueEvaluationLoop(execution, mock<Router>());

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

		continueEvaluationLoop(execution, mock<Router>());

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

		continueEvaluationLoop(execution, mock<Router>());

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

		continueEvaluationLoop(execution, mock<Router>());

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
});
