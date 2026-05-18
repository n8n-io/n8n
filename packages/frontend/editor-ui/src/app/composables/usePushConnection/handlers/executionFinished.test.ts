import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { useExecutionFinished, type SimplifiedExecution } from './executionFinished';
import type { IRunExecutionData, ITaskData, INodeTypeDescription } from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
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

const mockWorkflowState = mock<WorkflowState>({
	executingNode: {
		lastAddedExecutingNode: null,
	},
});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		currentRoute: { value: {} },
	})),
}));

vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(() => mockWorkflowState),
}));

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

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		updateNodesExecutionIssues: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn(() => ({
		getNodeTypes: vi.fn(() => ({})),
	})),
}));

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn(() => ({
		saveAsNewWorkflow: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn(),
	})),
}));

let executionFinished: ReturnType<typeof useExecutionFinished>['executionFinished'];
let continueEvaluationLoop: ReturnType<typeof useExecutionFinished>['continueEvaluationLoop'];
let getRunExecutionData: ReturnType<typeof useExecutionFinished>['getRunExecutionData'];
let handleExecutionFinishedWithSuccessOrOther: ReturnType<
	typeof useExecutionFinished
>['handleExecutionFinishedWithSuccessOrOther'];
let handleExecutionFinishedWithErrorOrCanceled: ReturnType<
	typeof useExecutionFinished
>['handleExecutionFinishedWithErrorOrCanceled'];

beforeEach(() => {
	vi.resetAllMocks();
	setActivePinia(createTestingPinia());

	({
		executionFinished,
		continueEvaluationLoop,
		getRunExecutionData,
		handleExecutionFinishedWithSuccessOrOther,
		handleExecutionFinishedWithErrorOrCanceled,
	} = useExecutionFinished());
});

describe('continueEvaluationLoop()', () => {
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

		continueEvaluationLoop(execution);

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

		continueEvaluationLoop(execution);

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

		continueEvaluationLoop(execution);

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

		continueEvaluationLoop(execution);

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

		continueEvaluationLoop(execution);

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
	it('should clear lastAddedExecutingNode when execution is finished', async () => {
		mockWorkflowState.executingNode.lastAddedExecutingNode = 'test-node';

		await executionFinished({
			type: 'executionFinished',
			data: {
				executionId: '1',
				workflowId: '1',
				status: 'success',
			},
		});

		expect(mockWorkflowState.executingNode.lastAddedExecutingNode).toBeNull();
	});

	describe('ready-to-run AI workflow tracking', () => {
		it('should track successful execution of ready-to-run-ai-workflow', async () => {
			const workflowsStore = useWorkflowsStore();
			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			await executionFinished({
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'success',
				},
			});

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track failed execution of ready-to-run-ai-workflow', async () => {
			const workflowsStore = useWorkflowsStore();
			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			await executionFinished({
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'error',
				},
			});

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('error');
		});

		it('should track execution of ready-to-run-ai-workflow-v5', async () => {
			const workflowsStore = useWorkflowsStore();
			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v5' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflowSuccess = vi.spyOn(
				readyToRunStore,
				'trackExecuteAiWorkflowSuccess',
			);

			await executionFinished({
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'success',
				},
			});

			expect(trackExecuteAiWorkflowSuccess).toHaveBeenCalled();
		});

		it('should track execution of ready-to-run-ai-workflow-v6', async () => {
			const workflowsStore = useWorkflowsStore();
			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
			vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
				id: '1',
				name: 'Test Workflow',
				meta: { templateId: 'ready-to-run-ai-workflow-v6' },
			} as IWorkflowDb);

			const trackExecuteAiWorkflow = vi.spyOn(readyToRunStore, 'trackExecuteAiWorkflow');

			await executionFinished({
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'canceled',
				},
			});

			expect(trackExecuteAiWorkflow).toHaveBeenCalledWith('canceled');
		});

		it('should not track execution for non-ready-to-run workflows', async () => {
			const workflowsStore = useWorkflowsStore();
			const workflowsListStore = useWorkflowsListStore();
			const readyToRunStore = useReadyToRunStore();

			vi.spyOn(workflowsStore, 'activeExecutionId', 'get').mockReturnValue('123');
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

			await executionFinished({
				type: 'executionFinished',
				data: {
					executionId: '123',
					workflowId: '1',
					status: 'success',
				},
			});

			expect(trackExecuteAiWorkflowSuccess).not.toHaveBeenCalled();
			expect(trackExecuteAiWorkflow).not.toHaveBeenCalled();
		});
	});

	it('should return early and clear active execution when fetchExecutionData returns undefined', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		const workflowsListStore = mockedStore(useWorkflowsListStore);
		const uiStore = mockedStore(useUIStore);

		workflowsStore.activeExecutionId = '123';

		vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
		} as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>);

		vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(null);

		const setProcessingExecutionResultsSpy = vi.spyOn(uiStore, 'setProcessingExecutionResults');

		await executionFinished({
			type: 'executionFinished',
			data: {
				executionId: '123',
				workflowId: '1',
				status: 'error',
			},
		});

		expect(mockWorkflowState.setActiveExecutionId).toHaveBeenCalledWith(undefined);
		expect(setProcessingExecutionResultsSpy).toHaveBeenCalledWith(false);
		expect(runWorkflow).not.toHaveBeenCalled();
	});

	it('should clear executing node queue even when fetchExecutionData returns undefined', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		const workflowsListStore = mockedStore(useWorkflowsListStore);

		workflowsStore.activeExecutionId = '123';

		vi.spyOn(workflowsListStore, 'getWorkflowById').mockReturnValue({
			id: '1',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
		} as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>);

		vi.spyOn(workflowsStore, 'fetchExecutionDataById').mockResolvedValue(null);

		await executionFinished({
			type: 'executionFinished',
			data: {
				executionId: '123',
				workflowId: '1',
				status: 'success',
			},
		});

		expect(mockWorkflowState.executingNode.clearNodeExecutionQueue).toHaveBeenCalled();
	});

	it('should clear executing node queue when activeExecutionId is undefined (iframe preview)', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.activeExecutionId = undefined;

		await executionFinished({
			type: 'executionFinished',
			data: {
				executionId: '123',
				workflowId: '1',
				status: 'success',
			},
		});

		expect(mockWorkflowState.executingNode.clearNodeExecutionQueue).toHaveBeenCalled();
	});
});

describe('manual execution stats tracking', () => {
	describe('handleExecutionFinishedWithSuccessOrOther', () => {
		it('increments success stats on successful execution', () => {
			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther('success', false);

			expect(incrementSpy).toHaveBeenCalledWith('success');
		});

		it('does not increment success stats when successToastAlreadyShown is true', () => {
			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther('success', true);

			expect(incrementSpy).not.toHaveBeenCalled();
		});

		it('does not increment stats for non-success status', () => {
			const builderStore = mockedStore(useBuilderStore);
			const incrementSpy = vi.spyOn(builderStore, 'incrementManualExecutionStats');

			handleExecutionFinishedWithSuccessOrOther('error', false);

			expect(incrementSpy).not.toHaveBeenCalled();
		});
	});

	describe('toast messages', () => {
		it('shows success toast when executed node has run data', () => {
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

			handleExecutionFinishedWithSuccessOrOther('success', false);

			expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('shows warning toast when executed node was not reached', () => {
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

			handleExecutionFinishedWithSuccessOrOther('success', false);

			expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('does not show warning toast when successToastAlreadyShown is true', () => {
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

			handleExecutionFinishedWithSuccessOrOther('success', true);

			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('handleExecutionFinishedWithErrorOrCanceled', () => {
		it('increments error stats on execution error', () => {
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
