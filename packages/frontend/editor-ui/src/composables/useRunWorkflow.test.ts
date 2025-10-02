import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import type router from 'vue-router';
import { ExpressionError, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IPinData,
	IRunData,
	Workflow,
	IExecuteData,
	ITaskData,
	INodeConnections,
	INode,
} from 'n8n-workflow';

import { useRunWorkflow } from '@/composables/useRunWorkflow';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';
import type { IExecutionResponse, IStartRunData } from '@/Interface';
import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useToast } from './useToast';
import { useI18n } from '@n8n/i18n';
import { captor, mock } from 'vitest-mock-extended';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { waitFor } from '@testing-library/vue';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { SLACK_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';

vi.mock('@/stores/workflows.store', () => {
	const storeState: Partial<ReturnType<typeof useWorkflowsStore>> & {
		activeExecutionId: string | null | undefined;
	} = {
		allNodes: [],
		runWorkflow: vi.fn(),
		subWorkflowExecutionError: null,
		getWorkflowRunData: null,
		workflowExecutionData: null,
		activeExecutionId: undefined,
		previousExecutionId: undefined,
		nodesIssuesExist: false,
		executionWaitingForWebhook: false,
		workflowObject: { id: '123' } as Workflow,
		getNodeByName: vi
			.fn()
			.mockImplementation((name) =>
				name === 'Test node' ? { name: 'Test node', id: 'Test id' } : undefined,
			),
		getExecution: vi.fn(),
		checkIfNodeHasChatParent: vi.fn(),
		getParametersLastUpdate: vi.fn(),
		getPinnedDataLastUpdate: vi.fn(),
		getPinnedDataLastRemovedAt: vi.fn(),
		incomingConnectionsByNodeName: vi.fn(),
		outgoingConnectionsByNodeName: vi.fn(),
		private: {
			setWorkflowSettings: vi.fn(),
			setActiveExecutionId: vi.fn((id: string | null | undefined) => {
				storeState.activeExecutionId = id;
			}),
		},
	};

	return {
		useWorkflowsStore: vi.fn().mockReturnValue(storeState),
	};
});

vi.mock('@/stores/parameterOverrides.store', () => {
	const storeState: Partial<ReturnType<typeof useAgentRequestStore>> & {} = {
		agentRequests: {},
		getAgentRequest: vi.fn(),
	};
	return {
		useAgentRequestStore: vi.fn().mockReturnValue(storeState),
	};
});

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: vi.fn().mockImplementation((key) => key) },
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockImplementation((key) => key) }),
}));

vi.mock('@/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		clearAllStickyNotifications: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		saveCurrentWorkflow: vi.fn(),
		getWorkflowDataToSave: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
	}),
}));

vi.mock('@/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn().mockReturnValue({
		updateNodesExecutionIssues: vi.fn(),
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRouter: vi.fn().mockReturnValue({
			push: vi.fn(),
		}),
		useRoute: vi.fn(),
	};
});

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

let workflowState: WorkflowState;

describe('useRunWorkflow({ router })', () => {
	let pushConnectionStore: ReturnType<typeof usePushConnectionStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let router: ReturnType<typeof useRouter>;
	let workflowHelpers: ReturnType<typeof useWorkflowHelpers>;
	let agentRequestStore: ReturnType<typeof useAgentRequestStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });

		setActivePinia(pinia);

		pushConnectionStore = usePushConnectionStore();
		uiStore = useUIStore();
		workflowsStore = useWorkflowsStore();
		agentRequestStore = useAgentRequestStore();

		workflowState = vi.mocked(useWorkflowState());
		// vi.mocked(workflowState.setActiveExecutionId).mockImplementation((id: string | null | undefined) => {
		// 	workflowsStore.activeExecutionId = id;
		// }
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		router = useRouter();
		workflowHelpers = useWorkflowHelpers();
	});

	afterEach(() => {
		workflowState.setActiveExecutionId(undefined);
		vi.clearAllMocks();
	});

	describe('runWorkflowApi()', () => {
		it('should throw an error if push connection is not active', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });

			vi.mocked(pushConnectionStore).isConnected = false;

			await expect(runWorkflowApi({} as IStartRunData)).rejects.toThrow(
				'workflowRun.noActiveConnectionToTheServer',
			);
		});

		it('should successfully run a workflow', async () => {
			const setActiveExecutionId = vi.spyOn(workflowState, 'setActiveExecutionId');
			const { runWorkflowApi } = useRunWorkflow({ router });

			vi.mocked(pushConnectionStore).isConnected = true;

			const mockResponse = { executionId: '123', waitingForWebhook: false };
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockResponse);

			const response = await runWorkflowApi({} as IStartRunData);

			expect(response).toEqual(mockResponse);
			expect(setActiveExecutionId).toHaveBeenNthCalledWith(1, null);
			expect(setActiveExecutionId).toHaveBeenNthCalledWith(2, '123');
			expect(workflowsStore.executionWaitingForWebhook).toBe(false);
		});

		it('should prevent running a webhook-based workflow that has issues', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue({
				executionId: '123',
				waitingForWebhook: true,
			});

			await expect(runWorkflowApi({} as IStartRunData)).rejects.toThrow(
				'workflowRun.showError.resolveOutstandingIssues',
			);

			vi.mocked(workflowsStore).nodesIssuesExist = false;
		});

		it('should handle workflow run failure', async () => {
			const setActiveExecutionId = vi.spyOn(workflowState, 'setActiveExecutionId');
			const { runWorkflowApi } = useRunWorkflow({ router });

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockRejectedValue(new Error('Failed to run workflow'));

			await expect(runWorkflowApi({} as IStartRunData)).rejects.toThrow('Failed to run workflow');
			expect(setActiveExecutionId).toHaveBeenCalledWith(undefined);
		});

		it('should set waitingForWebhook if response indicates waiting', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });

			vi.mocked(pushConnectionStore).isConnected = true;
			const mockResponse = { executionId: '123', waitingForWebhook: true };
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockResponse);

			const response = await runWorkflowApi({} as IStartRunData);

			expect(response).toEqual(mockResponse);
			expect(workflowsStore.executionWaitingForWebhook).toBe(true);
		});
	});

	describe('runWorkflow()', () => {
		it('should prevent execution and show error message when workflow is active with single webhook trigger', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			const toast = useToast();
			const i18n = useI18n();
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(workflowsStore).isWorkflowActive = true;

			vi.mocked(useWorkflowHelpers()).getWorkflowDataToSave.mockResolvedValue({
				nodes: [
					{
						name: 'Slack',
						type: SLACK_TRIGGER_NODE_TYPE,
						disabled: false,
					},
				],
			} as unknown as WorkflowData);

			const result = await runWorkflow({});

			expect(result).toBeUndefined();
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: i18n.baseText('workflowRun.showError.deactivate'),
				message: i18n.baseText('workflowRun.showError.productionActive', {
					interpolate: { nodeName: 'Webhook' },
				}),
				type: 'error',
			});
		});

		it('should execute the workflow if the single webhook trigger has pin data', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			const toast = useToast();
			const i18n = useI18n();
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(workflowsStore).isWorkflowActive = true;

			vi.mocked(useWorkflowHelpers()).getWorkflowDataToSave.mockResolvedValue({
				nodes: [
					{
						name: 'Slack',
						type: SLACK_TRIGGER_NODE_TYPE,
						disabled: false,
					},
				],
				pinData: {
					Slack: [{ json: { value: 'data2' } }],
				},
			} as unknown as WorkflowData);

			const mockExecutionResponse = { executionId: '123' };

			vi.mocked(uiStore).activeActions = [''];
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
			} as unknown as Workflow;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);

			expect(toast.showMessage).not.toHaveBeenCalledWith({
				title: i18n.baseText('workflowRun.showError.deactivate'),
				message: i18n.baseText('workflowRun.showError.productionActive', {
					interpolate: { nodeName: 'Webhook' },
				}),
				type: 'error',
			});
		});

		it('should execute the workflow if there is a single webhook trigger, but another trigger is chosen', async () => {
			// ARRANGE
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			const toast = useToast();
			const i18n = useI18n();
			const { runWorkflow } = useRunWorkflow({ router });
			const mockExecutionResponse = { executionId: '123' };
			const triggerNode = 'Manual';

			vi.mocked(workflowsStore).isWorkflowActive = true;
			vi.mocked(useWorkflowHelpers()).getWorkflowDataToSave.mockResolvedValue({
				nodes: [
					{
						name: 'Slack',
						type: SLACK_TRIGGER_NODE_TYPE,
						disabled: false,
					},
					{
						name: triggerNode,
						type: MANUAL_TRIGGER_NODE_TYPE,
						disabled: false,
					},
				],
			} as unknown as WorkflowData);
			vi.mocked(uiStore).activeActions = [''];
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
			} as unknown as Workflow;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowsStore).getWorkflowRunData = { NodeName: [] };

			// ACT
			const result = await runWorkflow({ triggerNode });

			// ASSERT
			expect(result).toEqual(mockExecutionResponse);
			expect(toast.showMessage).not.toHaveBeenCalledWith({
				title: i18n.baseText('workflowRun.showError.deactivate'),
				message: i18n.baseText('workflowRun.showError.productionActive', {
					interpolate: { nodeName: 'Webhook' },
				}),
				type: 'error',
			});
		});

		it('should prevent execution and show error message when workflow is active with multiple tirggers and a single webhook trigger is chosen', async () => {
			// ARRANGE
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			const toast = useToast();
			const i18n = useI18n();
			const { runWorkflow } = useRunWorkflow({ router });
			const mockExecutionResponse = { executionId: '123' };
			const triggerNode = 'Slack';

			vi.mocked(workflowsStore).isWorkflowActive = true;
			vi.mocked(useWorkflowHelpers()).getWorkflowDataToSave.mockResolvedValue({
				nodes: [
					{
						name: triggerNode,
						type: SLACK_TRIGGER_NODE_TYPE,
						disabled: false,
					},
					{
						name: 'Manual',
						type: MANUAL_TRIGGER_NODE_TYPE,
						disabled: false,
					},
				],
			} as unknown as WorkflowData);
			vi.mocked(uiStore).activeActions = [''];
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
			} as unknown as Workflow;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowsStore).getWorkflowRunData = { NodeName: [] };

			// ACT
			const result = await runWorkflow({ triggerNode });

			// ASSERT
			expect(result).toBeUndefined();
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: i18n.baseText('workflowRun.showError.deactivate'),
				message: i18n.baseText('workflowRun.showError.productionActive', {
					interpolate: { nodeName: 'Webhook' },
				}),
				type: 'error',
			});
		});

		it('should return undefined if UI action "workflowRunning" is active', async () => {
			const { runWorkflow } = useRunWorkflow({ router });
			workflowState.setActiveExecutionId('123');
			const result = await runWorkflow({});
			expect(result).toBeUndefined();
		});

		it('should execute workflow even if it has issues', async () => {
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(uiStore).activeActions = [''];
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
			} as unknown as Workflow;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = true;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);
		});

		it('should execute workflow successfully', async () => {
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
			} as Workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);
		});

		it('should exclude destinationNode from startNodes when provided', async () => {
			// ARRANGE
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });
			const dataCaptor = captor<IStartRunData>();

			const parentNodeName = 'parentNode';
			const destinationNodeName = 'destinationNode';

			// Mock workflow with parent-child relationship
			const workflow = {
				name: 'Test Workflow',
				id: 'workflowId',
				getParentNodes: vi.fn().mockImplementation((nodeName: string) => {
					if (nodeName === destinationNodeName) {
						return [parentNodeName];
					}
					return [];
				}),
				nodes: {
					[parentNodeName]: createTestNode({ name: parentNodeName }),
					[destinationNodeName]: createTestNode({ name: destinationNodeName }),
				},
			} as unknown as Workflow;

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowsStore).workflowObject = workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);

			vi.mocked(workflowsStore).getWorkflowRunData = {
				[parentNodeName]: [
					{
						startTime: 1,
						executionTime: 0,
						source: [],
						data: { main: [[{ json: { test: 'data' } }]] },
					},
				],
			} as unknown as IRunData;
			vi.mocked(workflowsStore).incomingConnectionsByNodeName.mockReturnValue({});

			// ACT
			await runWorkflow({ destinationNode: destinationNodeName });

			// ASSERT
			expect(workflowsStore.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(dataCaptor);

			const startNodes = dataCaptor.value.startNodes ?? [];
			const destinationInStartNodes = startNodes.some((node) => node.name === destinationNodeName);

			expect(destinationInStartNodes).toBe(false);
		});

		it('should send dirty nodes for partial executions v2', async () => {
			const composable = useRunWorkflow({ router });
			const parentName = 'When clicking';
			const executeName = 'Code';
			vi.mocked(workflowsStore).allNodes = [
				createTestNode({ name: parentName }),
				createTestNode({ name: executeName }),
			];
			vi.mocked(workflowsStore).outgoingConnectionsByNodeName.mockImplementation((nodeName) =>
				nodeName === parentName
					? { main: [[{ node: executeName, type: NodeConnectionTypes.Main, index: 0 }]] }
					: ({} as INodeConnections),
			);
			vi.mocked(workflowsStore).incomingConnectionsByNodeName.mockImplementation((nodeName) =>
				nodeName === executeName
					? { main: [[{ node: parentName, type: NodeConnectionTypes.Main, index: 0 }]] }
					: ({} as INodeConnections),
			);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				[parentName]: [
					{
						startTime: 1,
						executionIndex: 0,
						executionTime: 0,
						source: [],
					},
				],
				[executeName]: [
					{
						startTime: 1,
						executionIndex: 1,
						executionTime: 8,
						source: [
							{
								previousNode: parentName,
							},
						],
					},
				],
			};
			vi.mocked(workflowsStore).workflowObject = {
				name: 'Test Workflow',
				getParentNodes: () => [parentName],
				nodes: { [parentName]: {} },
			} as unknown as Workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				nodes: [],
			} as unknown as WorkflowData);
			vi.mocked(workflowHelpers).executeData.mockResolvedValue({
				data: {},
				node: {},
				source: null,
			} as IExecuteData);

			vi.mocked(workflowsStore).checkIfNodeHasChatParent.mockReturnValue(false);
			vi.mocked(workflowsStore).getParametersLastUpdate.mockImplementation((name: string) => {
				if (name === executeName) return 2;
				return undefined;
			});

			const { runWorkflow } = composable;

			await runWorkflow({ destinationNode: 'Code 1', source: 'Node.executeNode' });

			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ dirtyNodeNames: [executeName] }),
			);
		});

		it('should send triggerToStartFrom if triggerNode and nodeData are passed in', async () => {
			// ARRANGE
			const composable = useRunWorkflow({ router });
			const triggerNode = 'Chat Trigger';
			const nodeData = mock<ITaskData>();
			vi.mocked(workflowsStore).workflowObject = mock<Workflow>({
				getChildNodes: vi.fn().mockReturnValue([]),
			});
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ nodes: [] }),
			);

			const { runWorkflow } = composable;

			// ACT
			await runWorkflow({ triggerNode, nodeData });

			// ASSERT
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: {
						name: triggerNode,
						data: nodeData,
					},
					startNodes: [],
				}),
			);
		});

		it('should retrigger workflow from child node if triggerNode and nodeData are passed in', async () => {
			// ARRANGE
			const composable = useRunWorkflow({ router });
			const triggerNode = 'Chat Trigger';
			const nodeData = mock<ITaskData>();
			vi.mocked(workflowsStore).workflowObject = mock<Workflow>({
				getChildNodes: vi.fn().mockReturnValue([{ name: 'Child node', type: 'nodes.child' }]),
			});
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ nodes: [] }),
			);

			const { runWorkflow } = composable;

			// ACT
			await runWorkflow({ triggerNode, nodeData });

			// ASSERT
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: {
						name: triggerNode,
						data: nodeData,
					},
					startNodes: [
						{
							name: {
								name: 'Child node',
								type: 'nodes.child',
							},
							sourceData: null,
						},
					],
				}),
			);
		});

		it('should retrigger workflow from trigger node if rerunTriggerNode is set', async () => {
			// ARRANGE
			const composable = useRunWorkflow({ router });
			const triggerNode = 'Chat Trigger';
			const nodeData = mock<ITaskData>();
			vi.mocked(workflowsStore).workflowObject = mock<Workflow>({
				getChildNodes: vi.fn().mockReturnValue([{ name: 'Child node', type: 'nodes.child' }]),
			});
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ nodes: [] }),
			);

			const { runWorkflow } = composable;

			// ACT
			await runWorkflow({ triggerNode, nodeData, rerunTriggerNode: true });

			// ASSERT
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: {
						name: triggerNode,
						data: nodeData,
					},
					startNodes: [],
				}),
			);
		});

		it('should send triggerToStartFrom if triggerNode is passed in without nodeData', async () => {
			// ARRANGE
			const { runWorkflow } = useRunWorkflow({ router });
			const triggerNode = 'Chat Trigger';
			vi.mocked(workflowsStore).workflowObject = mock<Workflow>({
				getChildNodes: vi.fn().mockReturnValue([]),
			});
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ nodes: [] }),
			);

			// ACT
			await runWorkflow({ triggerNode });

			// ASSERT
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: {
						name: triggerNode,
					},
				}),
			);
		});

		it('sends agentRequest on partial execution', async () => {
			// ARRANGE
			const mockExecutionResponse = { executionId: '123' };
			const mockRunData = { nodeName: [] };
			const { runWorkflow } = useRunWorkflow({ router });
			const dataCaptor = captor();
			const agentRequest = {
				query: 'query',
				toolName: 'tool',
			};

			const workflow = mock<Workflow>({
				name: 'Test Workflow',
				id: 'WorkflowId',
				nodes: {
					'Test node': {
						id: 'Test id',
						name: 'Test node',
						parameters: {
							param: '0',
						},
					},
				},
			});

			const workflowData = {
				id: 'workflowId',
				nodes: [
					{
						id: 'Test id',
						name: 'Test node',
						parameters: {
							param: '0',
						},
						position: [0, 0],
						type: 'n8n-nodes-base.test',
						typeVersion: 1,
					} as INode,
				],
				connections: {},
			};

			workflow.getParentNodes.mockReturnValue([]);

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowsStore).workflowObject = workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(workflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = mockRunData;
			vi.mocked(agentRequestStore).getAgentRequest.mockReturnValue(agentRequest);

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// ACT
			const result = await runWorkflow({ destinationNode: 'Test node' });

			// ASSERT
			expect(agentRequestStore.getAgentRequest).toHaveBeenCalledWith('WorkflowId', 'Test id');
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith({
				agentRequest: {
					query: 'query',
					tool: {
						name: 'tool',
					},
				},
				destinationNode: 'Test node',
				dirtyNodeNames: undefined,
				runData: mockRunData,
				startNodes: [
					{
						name: 'Test node',
						sourceData: null,
					},
				],
				triggerToStartFrom: undefined,
				workflowData,
			});
			expect(result).toEqual(mockExecutionResponse);
			expect(setWorkflowExecutionData).toHaveBeenCalledTimes(1);
			expect(setWorkflowExecutionData).toHaveBeenCalledWith(dataCaptor);
			expect(dataCaptor.value).toMatchObject({ data: { resultData: { runData: mockRunData } } });
		});

		it('retains the original run data', async () => {
			// ARRANGE
			const mockExecutionResponse = { executionId: '123' };
			const mockRunData = { nodeName: [] };
			const { runWorkflow } = useRunWorkflow({ router });
			const dataCaptor = captor();
			const workflow = mock<Workflow>({ name: 'Test Workflow' });
			workflow.getParentNodes.mockReturnValue([]);

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowsStore).workflowObject = workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ id: 'workflowId', nodes: [] }),
			);
			vi.mocked(workflowsStore).getWorkflowRunData = mockRunData;

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// ACT
			const result = await runWorkflow({ destinationNode: 'some node name' });

			// ASSERT
			expect(result).toEqual(mockExecutionResponse);
			expect(setWorkflowExecutionData).toHaveBeenCalledTimes(1);
			expect(setWorkflowExecutionData).toHaveBeenCalledWith(dataCaptor);
			expect(dataCaptor.value).toMatchObject({ data: { resultData: { runData: mockRunData } } });
		});

		it("does not send run data if it's not a partial execution", async () => {
			// ARRANGE
			const mockExecutionResponse = { executionId: '123' };
			const mockRunData = { nodeName: [] };
			const { runWorkflow } = useRunWorkflow({ router });
			const dataCaptor = captor();
			const workflow = mock<Workflow>({ name: 'Test Workflow' });
			workflow.getParentNodes.mockReturnValue([]);

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			vi.mocked(workflowsStore).nodesIssuesExist = false;
			vi.mocked(workflowsStore).workflowObject = workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue(
				mock<WorkflowData>({ id: 'workflowId', nodes: [] }),
			);
			vi.mocked(workflowsStore).getWorkflowRunData = mockRunData;

			// ACT
			const result = await runWorkflow({});

			// ASSERT
			expect(result).toEqual(mockExecutionResponse);
			expect(workflowsStore.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(dataCaptor);
			expect(dataCaptor.value).toHaveProperty('runData', undefined);
		});

		it('should set execution data to null if the execution did not start successfully', async () => {
			const { runWorkflow } = useRunWorkflow({ router });
			const workflow = mock<Workflow>({ name: 'Test Workflow' });

			vi.mocked(workflowsStore).workflowObject = workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: workflow.id,
				nodes: [],
			} as unknown as WorkflowData);

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// Simulate failed execution start
			vi.mocked(workflowsStore).runWorkflow.mockRejectedValueOnce(new Error());

			await runWorkflow({});

			expect(workflowsStore.runWorkflow).toHaveBeenCalledTimes(1);
			expect(setWorkflowExecutionData).lastCalledWith(null);
		});
	});

	describe('consolidateRunDataAndStartNodes()', () => {
		it('should return empty runData and startNodeNames if runData is null', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const workflowMock = {
				getParentNodes: vi.fn(),
				nodes: {},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes([], null, undefined, workflowMock);
			expect(result).toEqual({ runData: undefined, startNodeNames: [] });
		});

		it('should return correct startNodeNames and newRunData for given directParentNodes and runData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1', 'node2'];
			const runData = {
				node2: [{ data: { main: [[{ json: { value: 'data2' } }]] } }],
				node3: [{ data: { main: [[{ json: { value: 'data3' } }]] } }],
			} as unknown as IRunData;
			const pinData: IPinData = {
				node2: [{ json: { value: 'data2' } }],
			};
			const workflowMock = {
				getParentNodes: vi.fn().mockImplementation((node) => {
					if (node === 'node1') return ['node3'];
					return [];
				}),
				nodes: {
					node1: { disabled: false },
					node2: { disabled: false },
					node3: { disabled: true },
				},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				pinData,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.startNodeNames).not.toContain('node3');
			expect(result.runData).toEqual(runData);
		});

		it('should include directParentNode in startNodeNames if it has no runData or pinData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1'];
			const runData = {
				node2: [
					{
						data: {
							main: [[{ json: { value: 'data2' } }]],
						},
					},
				],
			} as unknown as IRunData;
			const workflowMock = {
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: { node1: { disabled: false } },
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				undefined,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.runData).toBeUndefined();
		});

		it('should rerun failed parent nodes, adding them to the returned list of start nodes and not adding their result to runData', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const directParentNodes = ['node1'];
			const runData = {
				node1: [
					{
						error: new ExpressionError('error'),
					},
				],
			} as unknown as IRunData;
			const workflowMock = {
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					node1: { disabled: false },
					node2: { disabled: false },
				},
			} as unknown as Workflow;

			const result = consolidateRunDataAndStartNodes(
				directParentNodes,
				runData,
				undefined,
				workflowMock,
			);

			expect(result.startNodeNames).toContain('node1');
			expect(result.runData).toEqual(undefined);
		});
	});

	describe('runEntireWorkflow()', () => {
		it('should invoke runWorkflow with expected arguments', async () => {
			const runWorkflowComposable = useRunWorkflow({ router });

			vi.mocked(workflowsStore).workflowObject = {
				id: 'workflowId',
			} as unknown as Workflow;
			vi.mocked(workflowHelpers).getWorkflowDataToSave.mockResolvedValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);

			await runWorkflowComposable.runEntireWorkflow('main', 'foo');

			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith({
				runData: undefined,
				startNodes: [],
				triggerToStartFrom: {
					data: undefined,
					name: 'foo',
				},
				workflowData: {
					id: 'workflowId',
					nodes: [],
				},
			});
		});
	});

	describe('stopCurrentExecution()', () => {
		it('should not prematurely call markExecutionAsStopped() while execution status is still "running"', async () => {
			const runWorkflowComposable = useRunWorkflow({ router });
			const executionData: IExecutionResponse = {
				id: 'test-exec-id',
				workflowData: createTestWorkflow({ id: 'test-wf-id' }),
				finished: false,
				mode: 'manual',
				status: 'running',
				startedAt: new Date('2025-04-01T00:00:00.000Z'),
				createdAt: new Date('2025-04-01T00:00:00.000Z'),
			};
			const markStoppedSpy = vi.spyOn(workflowState, 'markExecutionAsStopped');
			const getExecutionSpy = vi.spyOn(workflowsStore, 'getExecution');

			workflowsStore.activeWorkflows = ['test-wf-id'];
			workflowState.setActiveExecutionId('test-exec-id');
			workflowsStore.executionWaitingForWebhook = false;

			getExecutionSpy.mockResolvedValue(executionData);

			// Exercise - don't wait for returned promise to resolve
			void runWorkflowComposable.stopCurrentExecution();

			// Assert that markExecutionAsStopped() isn't called yet after a simulated delay
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(markStoppedSpy).not.toHaveBeenCalled();
			await waitFor(() => expect(getExecutionSpy).toHaveBeenCalledWith('test-exec-id'));

			getExecutionSpy.mockReset();
			expect(getExecutionSpy).toHaveBeenCalledTimes(0);

			// Simulated executionFinished event
			getExecutionSpy.mockResolvedValue({
				...executionData,
				status: 'canceled',
				stoppedAt: new Date('2025-04-01T00:00:99.000Z'),
			});

			// Assert that markExecutionAsStopped() is called eventually
			await waitFor(() => expect(markStoppedSpy).toHaveBeenCalled());
			expect(getExecutionSpy).toHaveBeenCalledWith('test-exec-id');
		});
	});

	describe('sortNodesByYPosition()', () => {
		const getNodeUi = (name: string, position: [number, number]) => {
			return {
				name,
				position,
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				id: name,
				parameters: {},
			};
		};
		it('should sort nodes by Y position in ascending order', () => {
			const { sortNodesByYPosition } = useRunWorkflow({ router });

			const topNode = 'topNode';
			const middleNode = 'middleNode';
			const bottomNode = 'bottomNode';

			vi.mocked(workflowsStore.getNodeByName).mockImplementation((name) => {
				if (name === topNode) return getNodeUi(topNode, [100, 50]);
				if (name === middleNode) return getNodeUi(middleNode, [200, 200]);
				if (name === bottomNode) return getNodeUi(bottomNode, [150, 350]);
				return null;
			});

			// Test with different order of input nodes
			const result = sortNodesByYPosition([bottomNode, topNode, middleNode]);

			// Should be sorted by Y position (top to bottom)
			expect(result).toEqual([topNode, middleNode, bottomNode]);
		});
	});
});
