import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import type router from 'vue-router';
import { BINARY_MODE_COMBINED, ExpressionError, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IPinData,
	IRunData,
	IExecuteData,
	ITaskData,
	INodeConnections,
	INode,
} from 'n8n-workflow';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/app/composables/useWorkflowState';
import { chatEventBus } from '@n8n/chat/event-buses';
import { useChat } from '@n8n/chat/composables';
import type { IStartRunData } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { captor, mock } from 'vitest-mock-extended';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { waitFor } from '@testing-library/vue';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import {
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	CHAT_NODE_TYPE,
	CHAT_TOOL_NODE_TYPE,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	CHAT_HITL_TOOL_NODE_TYPE,
} from '../constants';
import type { WorkflowObjectAccessors } from '../types';

const { mockDocumentStore } = vi.hoisted(() => {
	const store = {
		workflowId: '123',
		name: 'Test Workflow',
		allNodes: [] as unknown[],
		getNodeByName: vi.fn(),
		getParentNodes: vi.fn().mockReturnValue([]),
		getChildNodes: vi.fn().mockReturnValue([]),
		getStartNode: vi.fn(),
		checkIfNodeHasChatParent: vi.fn(),
		checkIfToolNodeHasChatParent: vi.fn(),
		connectionsBySourceNode: {} as Record<string, unknown>,
		pinData: {} as Record<string, unknown>,
		incomingConnectionsByNodeName: vi.fn().mockReturnValue({}),
		outgoingConnectionsByNodeName: vi.fn().mockReturnValue({}),
		getParametersLastUpdate: vi.fn(),
		getPinnedDataLastUpdate: vi.fn(),
		getPinnedDataLastRemovedAt: vi.fn(),
		getSnapshot: vi.fn(),
		hasNodeValidationIssues: false,
		nodeValidationIssues: [],
		serialize: vi.fn(),
	};
	store.getSnapshot.mockReturnValue({
		id: store.workflowId,
		getNode: store.getNodeByName,
		getParentNodes: store.getParentNodes,
		getChildNodes: store.getChildNodes,
		connectionsBySourceNode: store.connectionsBySourceNode,
		pinData: store.pinData,
	});
	return { mockDocumentStore: store };
});

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStore,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
}));

vi.mock('@/app/stores/workflows.store', () => {
	const storeState: Partial<ReturnType<typeof useWorkflowsStore>> & {
		activeExecutionId: string | null | undefined;
	} = {
		runWorkflow: vi.fn(),
		getWorkflowRunData: null,
		workflowExecutionData: null,
		activeExecutionId: undefined,
		previousExecutionId: undefined,
		executionWaitingForWebhook: false,
		workflow: {
			nodes: [],
			id: '',
			name: '',
			active: false,
			isArchived: false,
			createdAt: '',
			updatedAt: '',
			connections: {},
			versionId: '',
			activeVersionId: null,
		},
		workflowId: '123',
		isWorkflowSaved: {
			'123': true,
		},
		getNodeByName: vi
			.fn()
			.mockImplementation((name) =>
				name === 'Test node' ? { name: 'Test node', id: 'Test id' } : undefined,
			),
		getExecution: vi.fn(),
		incomingConnectionsByNodeName: vi.fn(),
		outgoingConnectionsByNodeName: vi.fn(),
		private: {
			setActiveExecutionId: vi.fn((id: string | null | undefined) => {
				storeState.activeExecutionId = id;
			}),
		},
	};

	return {
		useWorkflowsStore: vi.fn().mockReturnValue(storeState),
	};
});

vi.mock('@/app/stores/workflowsList.store', () => {
	const storeState = {
		activeWorkflows: [] as string[],
		workflowsById: {
			'123': {
				id: '123',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: '',
				updatedAt: '',
				connections: {},
				nodes: [],
				versionId: '',
				activeVersionId: null,
			},
		},
	};
	return {
		useWorkflowsListStore: vi.fn().mockReturnValue(storeState),
	};
});

vi.mock('@/app/stores/parameterOverrides.store', () => {
	const storeState: Partial<ReturnType<typeof useAgentRequestStore>> & {} = {
		agentRequests: {},
		getAgentRequest: vi.fn(),
	};
	return {
		useAgentRequestStore: vi.fn().mockReturnValue(storeState),
	};
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		binaryDataMode: 'filesystem',
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: vi.fn().mockImplementation((key) => key) },
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockImplementation((key) => key) }),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		clearAllStickyNotifications: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		saveCurrentWorkflow: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
	}),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn().mockReturnValue({
		updateNodesExecutionIssues: vi.fn(),
	}),
}));

vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

vi.mock('@n8n/chat/composables', () => ({
	useChat: vi.fn().mockReturnValue({ ws: null }),
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

vi.mock('@/app/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/app/composables/useWorkflowState');
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
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		router = useRouter();
		workflowHelpers = useWorkflowHelpers();

		// Reset document store to defaults
		mockDocumentStore.allNodes = [];
		mockDocumentStore.workflowId = '123';
		mockDocumentStore.name = 'Test Workflow';
		mockDocumentStore.connectionsBySourceNode = {};
		mockDocumentStore.pinData = {};
		mockDocumentStore.getNodeByName = vi.fn();
		mockDocumentStore.getParentNodes = vi.fn().mockReturnValue([]);
		mockDocumentStore.getChildNodes = vi.fn().mockReturnValue([]);
		mockDocumentStore.getStartNode = vi.fn();
		mockDocumentStore.incomingConnectionsByNodeName = vi.fn().mockReturnValue({});
		mockDocumentStore.outgoingConnectionsByNodeName = vi.fn().mockReturnValue({});
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

		it('should not prevent running a webhook-based workflow that has issues', async () => {
			const { runWorkflowApi } = useRunWorkflow({ router });
			mockDocumentStore.hasNodeValidationIssues = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue({
				executionId: '123',
				waitingForWebhook: true,
			});

			await expect(runWorkflowApi({} as IStartRunData)).resolves.not.toThrow();

			mockDocumentStore.hasNodeValidationIssues = false;
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
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			mockDocumentStore.hasNodeValidationIssues = true;
			mockDocumentStore.serialize.mockReturnValue({
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
			mockDocumentStore.hasNodeValidationIssues = false;
			mockDocumentStore.serialize.mockReturnValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = {
				NodeName: [],
			};

			const result = await runWorkflow({});
			expect(result).toEqual(mockExecutionResponse);
		});

		it('should prevent execution and show error when binary mode is "combined" with filesystem mode "default"', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			const toast = useToast();
			const rootStore = useRootStore();
			const { runWorkflow } = useRunWorkflow({ router });

			vi.mocked(rootStore).binaryDataMode = 'default';
			mockDocumentStore.serialize.mockReturnValue({
				id: 'workflowId',
				nodes: [],
				settings: {
					binaryMode: BINARY_MODE_COMBINED,
				},
			} as unknown as WorkflowData);

			const result = await runWorkflow({});

			expect(result).toBeUndefined();
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: useI18n().baseText('workflowRun.showError.unsupportedExecutionLogic.title'),
				message: useI18n().baseText('workflowRun.showError.unsupportedExecutionLogic.description'),
				type: 'error',
			});
		});

		it('should exclude destinationNode from startNodes when provided', async () => {
			// ARRANGE
			const mockExecutionResponse = { executionId: '123' };
			const { runWorkflow } = useRunWorkflow({ router });
			const dataCaptor = captor<IStartRunData>();

			const parentNodeName = 'parentNode';
			const destinationNodeName = 'destinationNode';

			vi.mocked(mockDocumentStore.getParentNodes).mockImplementation((nodeName: string) => {
				if (nodeName === destinationNodeName) {
					return [parentNodeName];
				}
				return [];
			});
			vi.mocked(mockDocumentStore.getNodeByName).mockImplementation((name: string) => {
				const nodes: Record<string, unknown> = {
					[parentNodeName]: createTestNode({ name: parentNodeName }),
					[destinationNodeName]: createTestNode({ name: destinationNodeName }),
				};
				return nodes[name];
			});

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			mockDocumentStore.hasNodeValidationIssues = false;
			mockDocumentStore.serialize.mockReturnValue({
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

			// ACT
			await runWorkflow({ destinationNode: { nodeName: destinationNodeName, mode: 'inclusive' } });

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
			mockDocumentStore.allNodes = [
				createTestNode({ name: parentName }),
				createTestNode({ name: executeName }),
			];
			vi.mocked(mockDocumentStore.outgoingConnectionsByNodeName).mockImplementation((nodeName) =>
				nodeName === parentName
					? { main: [[{ node: executeName, type: NodeConnectionTypes.Main, index: 0 }]] }
					: ({} as INodeConnections),
			);
			vi.mocked(mockDocumentStore.incomingConnectionsByNodeName).mockImplementation((nodeName) =>
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
			mockDocumentStore.serialize.mockReturnValue({
				nodes: [],
			} as unknown as WorkflowData);
			vi.mocked(workflowHelpers).executeData.mockResolvedValue({
				data: {},
				node: {},
				source: null,
			} as IExecuteData);

			mockDocumentStore.checkIfNodeHasChatParent.mockReturnValue(false);
			mockDocumentStore.getParametersLastUpdate.mockImplementation((name: string) => {
				if (name === executeName) return 2;
				return undefined;
			});

			const { runWorkflow } = composable;

			await runWorkflow({
				destinationNode: { nodeName: 'Code 1', mode: 'inclusive' },
				source: 'Node.executeNode',
			});

			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ dirtyNodeNames: [executeName] }),
			);
		});

		it('should send triggerToStartFrom if triggerNode and nodeData are passed in', async () => {
			// ARRANGE
			const composable = useRunWorkflow({ router });
			const triggerNode = 'Chat Trigger';
			const nodeData = mock<ITaskData>();
			mockDocumentStore.serialize.mockReturnValue(mock<WorkflowData>({ nodes: [] }));

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
			vi.mocked(mockDocumentStore.getChildNodes).mockReturnValue([
				{ name: 'Child node', type: 'nodes.child' },
			]);
			mockDocumentStore.serialize.mockReturnValue(mock<WorkflowData>({ nodes: [] }));

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
			mockDocumentStore.serialize.mockReturnValue(mock<WorkflowData>({ nodes: [] }));

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
			mockDocumentStore.serialize.mockReturnValue(mock<WorkflowData>({ nodes: [] }));

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
				query: { 'Test node': { query: 'query' } },
				toolName: 'tool',
			};

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

			vi.mocked(mockDocumentStore.getNodeByName).mockImplementation((name: string) =>
				name === 'Test node' ? { id: 'Test id', name: 'Test node' } : undefined,
			);

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			mockDocumentStore.hasNodeValidationIssues = false;
			mockDocumentStore.serialize.mockReturnValue(workflowData);
			vi.mocked(workflowsStore).getWorkflowRunData = mockRunData;
			vi.mocked(agentRequestStore).getAgentRequest.mockReturnValue(agentRequest);

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// ACT
			const result = await runWorkflow({
				destinationNode: { nodeName: 'Test node', mode: 'inclusive' },
			});

			// ASSERT
			expect(agentRequestStore.getAgentRequest).toHaveBeenCalledWith('123', 'Test id');
			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith({
				agentRequest: {
					query: { 'Test node': { query: 'query' } },
					tool: {
						name: 'tool',
					},
				},
				destinationNode: { nodeName: 'Test node', mode: 'inclusive' },
				dirtyNodeNames: undefined,
				runData: mockRunData,
				startNodes: [
					{
						name: 'Test node',
						sourceData: null,
					},
				],
				triggerToStartFrom: undefined,
				workflowId: workflowData.id,
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

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			mockDocumentStore.hasNodeValidationIssues = false;
			mockDocumentStore.serialize.mockReturnValue(
				mock<WorkflowData>({ id: 'workflowId', nodes: [] }),
			);
			vi.mocked(workflowsStore).getWorkflowRunData = mockRunData;

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// ACT
			const result = await runWorkflow({
				destinationNode: { nodeName: 'some node name', mode: 'inclusive' },
			});

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

			vi.mocked(pushConnectionStore).isConnected = true;
			vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
			mockDocumentStore.hasNodeValidationIssues = false;
			mockDocumentStore.serialize.mockReturnValue(
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

			mockDocumentStore.serialize.mockReturnValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);

			const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

			// Simulate failed execution start
			vi.mocked(workflowsStore).runWorkflow.mockRejectedValueOnce(new Error());

			await runWorkflow({});

			expect(workflowsStore.runWorkflow).toHaveBeenCalledTimes(1);
			expect(setWorkflowExecutionData).lastCalledWith(null);
		});

		describe('setupWebsocket for partial chat execution', () => {
			const workflowWithChatTriggerResponseNodes = {
				id: 'workflowId',
				nodes: [
					{
						name: 'Chat Trigger',
						type: CHAT_TRIGGER_NODE_TYPE,
						parameters: {
							options: {
								responseMode: 'responseNodes',
							},
						},
						disabled: false,
					} as unknown as INode,
				],
			} as unknown as WorkflowData;

			beforeEach(() => {
				vi.mocked(pushConnectionStore).isConnected = true;
				vi.mocked(workflowsStore).runWorkflow.mockResolvedValue({ executionId: 'exec-123' });
				mockDocumentStore.hasNodeValidationIssues = false;
				mockDocumentStore.checkIfNodeHasChatParent.mockReturnValue(false);
				mockDocumentStore.checkIfToolNodeHasChatParent.mockReturnValue(false);
			});

			it('emits setupWebsocket when chat trigger has responseMode responseNodes and no active ws', async () => {
				vi.mocked(useChat).mockReturnValue({ ws: null } as unknown as ReturnType<typeof useChat>);
				const { runWorkflow } = useRunWorkflow({ router });

				mockDocumentStore.serialize.mockReturnValue(workflowWithChatTriggerResponseNodes);

				await runWorkflow({ triggerNode: 'Chat Trigger' });

				expect(chatEventBus.emit).toHaveBeenCalledWith('setupWebsocket', 'exec-123');
			});

			it('does not emit setupWebsocket when chatStore.ws is already set', async () => {
				vi.mocked(useChat).mockReturnValue({
					ws: {} as WebSocket,
				} as unknown as ReturnType<typeof useChat>);
				const { runWorkflow } = useRunWorkflow({ router });

				mockDocumentStore.serialize.mockReturnValue(workflowWithChatTriggerResponseNodes);

				await runWorkflow({ triggerNode: 'Chat Trigger' });

				expect(chatEventBus.emit).not.toHaveBeenCalledWith('setupWebsocket', expect.anything());
			});

			it('does not emit setupWebsocket when source is RunData.ManualChatMessage', async () => {
				vi.mocked(useChat).mockReturnValue({ ws: null } as unknown as ReturnType<typeof useChat>);
				const { runWorkflow } = useRunWorkflow({ router });

				mockDocumentStore.serialize.mockReturnValue(workflowWithChatTriggerResponseNodes);

				await runWorkflow({ triggerNode: 'Chat Trigger', source: 'RunData.ManualChatMessage' });

				expect(chatEventBus.emit).not.toHaveBeenCalledWith('setupWebsocket', expect.anything());
			});

			it('does not emit setupWebsocket when source is RunData.ManualChatTrigger', async () => {
				vi.mocked(useChat).mockReturnValue({ ws: null } as unknown as ReturnType<typeof useChat>);
				const { runWorkflow } = useRunWorkflow({ router });

				mockDocumentStore.serialize.mockReturnValue(workflowWithChatTriggerResponseNodes);

				await runWorkflow({ triggerNode: 'Chat Trigger', source: 'RunData.ManualChatTrigger' });

				expect(chatEventBus.emit).not.toHaveBeenCalledWith('setupWebsocket', expect.anything());
			});
		});

		describe('Chat trigger warnings', () => {
			const mockExecutionResponse = { executionId: '123' };
			const toast = useToast();
			const i18n = useI18n();

			beforeEach(() => {
				vi.mocked(pushConnectionStore).isConnected = true;
				vi.mocked(workflowsStore).runWorkflow.mockResolvedValue(mockExecutionResponse);
				mockDocumentStore.hasNodeValidationIssues = false;
				vi.mocked(workflowsStore).getWorkflowRunData = {
					NodeName: [],
				};
			});

			it("should show a warning if there are no chat response nodes and chat trigger's response mode is `responseNodes`", async () => {
				const { runWorkflow } = useRunWorkflow({ router });
				mockDocumentStore.serialize.mockReturnValue({
					id: 'workflowId',
					nodes: [
						{
							name: 'Chat Trigger',
							type: CHAT_TRIGGER_NODE_TYPE,
							parameters: {
								options: {
									responseMode: 'responseNodes',
								},
							},
						},
					],
				} as unknown as WorkflowData);

				const result = await runWorkflow({ triggerNode: 'Chat Trigger' });

				expect(result).toEqual(mockExecutionResponse);
				expect(toast.showMessage).toHaveBeenCalledWith({
					title: i18n.baseText('workflowRun.showWarning.noChatResponseNodes.title'),
					message: i18n.baseText('workflowRun.showWarning.noChatResponseNodes.description'),
					type: 'warning',
				});
			});

			it.each([['lastNode'], ['streaming']])(
				"should not show a warning if there are no chat response nodes but chat trigger's response mode is `%s`",
				async (responseMode) => {
					const { runWorkflow } = useRunWorkflow({ router });
					mockDocumentStore.serialize.mockReturnValue({
						id: 'workflowId',
						nodes: [
							{
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								parameters: {
									options: {
										responseMode,
									},
								},
							},
						],
					} as unknown as WorkflowData);

					const result = await runWorkflow({ triggerNode: 'Chat Trigger' });

					expect(result).toEqual(mockExecutionResponse);
					expect(toast.showMessage).not.toHaveBeenCalled();
				},
			);

			it('should not show a warning if the workflow was started from a different trigger node', async () => {
				const { runWorkflow } = useRunWorkflow({ router });
				mockDocumentStore.serialize.mockReturnValue({
					id: 'workflowId',
					nodes: [
						{
							name: 'Chat Trigger',
							type: CHAT_TRIGGER_NODE_TYPE,
							parameters: {
								options: {
									responseMode: 'responseNodes',
								},
							},
						},
						{
							name: 'Manual Trigger',
							type: MANUAL_TRIGGER_NODE_TYPE,
						},
					],
				} as unknown as WorkflowData);

				const result = await runWorkflow({ triggerNode: 'Manual Trigger' });

				expect(result).toEqual(mockExecutionResponse);
				expect(toast.showMessage).not.toHaveBeenCalled();
			});

			it.each([
				[CHAT_NODE_TYPE],
				[CHAT_TOOL_NODE_TYPE],
				[CHAT_HITL_TOOL_NODE_TYPE],
				[RESPOND_TO_WEBHOOK_NODE_TYPE],
			])(
				'should not show a warning if the there are response nodes in the workflow (%s)',
				async (responseNodeType) => {
					const { runWorkflow } = useRunWorkflow({ router });
					mockDocumentStore.serialize.mockReturnValue({
						id: 'workflowId',
						nodes: [
							{
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								parameters: {
									options: {
										responseMode: 'responseNodes',
									},
								},
							},
							{
								name: 'Response Node',
								type: responseNodeType,
							},
						],
					} as unknown as WorkflowData);

					const result = await runWorkflow({ triggerNode: 'Chat Trigger' });

					expect(result).toEqual(mockExecutionResponse);
					expect(toast.showMessage).not.toHaveBeenCalled();
				},
			);

			it('should show a warning if all the response nodes are disabled', async () => {
				const { runWorkflow } = useRunWorkflow({ router });
				mockDocumentStore.serialize.mockReturnValue({
					id: 'workflowId',
					nodes: [
						{
							name: 'Chat Trigger',
							type: CHAT_TRIGGER_NODE_TYPE,
							parameters: {
								options: {
									responseMode: 'responseNodes',
								},
							},
						},
						{
							name: 'Response Node',
							type: CHAT_NODE_TYPE,
							disabled: true,
						},
					],
				} as unknown as WorkflowData);

				const result = await runWorkflow({ triggerNode: 'Chat Trigger' });

				expect(result).toEqual(mockExecutionResponse);
				expect(toast.showMessage).toHaveBeenCalledWith({
					title: i18n.baseText('workflowRun.showWarning.noChatResponseNodes.title'),
					message: i18n.baseText('workflowRun.showWarning.noChatResponseNodes.description'),
					type: 'warning',
				});
			});
		});
	});

	describe('consolidateRunDataAndStartNodes()', () => {
		it('should return empty runData and startNodeNames if runData is null', () => {
			const { consolidateRunDataAndStartNodes } = useRunWorkflow({ router });
			const workflowMock = {
				getParentNodes: vi.fn(),
				getNode: vi.fn(),
			} as Partial<WorkflowObjectAccessors> as WorkflowObjectAccessors;

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
				getNode: (name: string) => {
					if (name === 'node1') return { disabled: false };
					if (name === 'node2') return { disabled: false };
					if (name === 'node3') return { disabled: true };
					return null;
				},
			} as Partial<WorkflowObjectAccessors> as WorkflowObjectAccessors;

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
				getNode: (name: string) => {
					if (name === 'node1') return { disabled: false };
					return null;
				},
			} as Partial<WorkflowObjectAccessors> as WorkflowObjectAccessors;

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
				getNode: (name: string) => {
					if (name === 'node1') return { disabled: false };
					if (name === 'node2') return { disabled: false };
					return null;
				},
			} as Partial<WorkflowObjectAccessors> as WorkflowObjectAccessors;

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

			mockDocumentStore.serialize.mockReturnValue({
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
				workflowId: 'workflowId',
			});
		});

		it('should resolve single trigger when no trigger is selected', async () => {
			const chatTrigger = createTestNode({
				name: 'When chat message received',
				type: CHAT_TRIGGER_NODE_TYPE,
			});
			const runWorkflowComposable = useRunWorkflow({ router });

			mockDocumentStore.allNodes = [chatTrigger];
			vi.mocked(workflowsStore).selectedTriggerNodeName = undefined;
			mockDocumentStore.serialize.mockReturnValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);

			await runWorkflowComposable.runEntireWorkflow('main');

			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: {
						data: undefined,
						name: 'When chat message received',
					},
				}),
			);
		});

		it('should not resolve trigger when multiple triggers exist', async () => {
			const chatTrigger = createTestNode({
				name: 'When chat message received',
				type: CHAT_TRIGGER_NODE_TYPE,
			});
			const manualTrigger = createTestNode({
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
			});
			const runWorkflowComposable = useRunWorkflow({ router });

			mockDocumentStore.allNodes = [chatTrigger, manualTrigger];
			vi.mocked(workflowsStore).selectedTriggerNodeName = undefined;
			mockDocumentStore.serialize.mockReturnValue({
				id: 'workflowId',
				nodes: [],
			} as unknown as WorkflowData);

			await runWorkflowComposable.runEntireWorkflow('main');

			expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerToStartFrom: undefined,
				}),
			);
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

			const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
			const workflowsListStore = useWorkflowsListStore();
			(workflowsListStore.activeWorkflows as string[]).splice(
				0,
				workflowsListStore.activeWorkflows.length,
				'test-wf-id',
			);
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

			vi.mocked(mockDocumentStore.getNodeByName).mockImplementation((name: string) => {
				if (name === topNode) return getNodeUi(topNode, [100, 50]);
				if (name === middleNode) return getNodeUi(middleNode, [200, 200]);
				if (name === bottomNode) return getNodeUi(bottomNode, [150, 350]);
				return undefined;
			});

			// Test with different order of input nodes
			const result = sortNodesByYPosition([bottomNode, topNode, middleNode]);

			// Should be sorted by Y position (top to bottom)
			expect(result).toEqual([topNode, middleNode, bottomNode]);
		});
	});
});
