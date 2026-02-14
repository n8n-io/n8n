import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import { mock } from 'jest-mock-extended';
import * as core from 'n8n-core';
import { DirectedGraph, recreateNodeExecutionStack, WorkflowExecute } from 'n8n-core';
import { NodeHelpers } from 'n8n-workflow';
import type {
	Workflow,
	IWorkflowExecutionDataProcess,
	IWorkflowExecuteAdditionalData,
	IPinData,
	ITaskData,
	INode,
	IRun,
	IExecuteData,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	INodeExecutionData,
	IDestinationNode,
	INodeTypeDescription,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import { ManualExecutionService } from '@/manual-execution.service';

jest.mock('n8n-core');

describe('ManualExecutionService', () => {
	const manualExecutionService = new ManualExecutionService(mock());

	describe('getExecutionStartNode', () => {
		it('Should return undefined', () => {
			const data = mock<IWorkflowExecutionDataProcess>();
			const workflow = mock<Workflow>({
				getTriggerNodes() {
					return [];
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode).toBeUndefined();
		});

		it('Should return startNode', () => {
			const data = mock<IWorkflowExecutionDataProcess>({
				pinData: {
					node1: [mock<INodeExecutionData>()],
					node2: [mock<INodeExecutionData>()],
				},
				startNodes: [{ name: 'node2' }],
			});
			const workflow = mock<Workflow>({
				getNode(nodeName: string) {
					if (nodeName === 'node2') {
						return mock<INode>({ name: 'node2' });
					}
					return null;
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toEqual('node2');
		});

		it('Should return triggerToStartFrom trigger node', () => {
			const data = mock<IWorkflowExecutionDataProcess>({
				pinData: {
					node1: [mock<INodeExecutionData>()],
					node2: [mock<INodeExecutionData>()],
				},
				triggerToStartFrom: { name: 'node3' },
			});
			const workflow = mock<Workflow>({
				getNode(nodeName: string) {
					return mock<INode>({ name: nodeName });
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toEqual('node3');
		});

		it('should return undefined, even if manual trigger node is available', () => {
			const scheduleTrigger = mock<INode>({
				type: 'n8n-nodes-base.scheduleTrigger',
				name: 'Wed 12:00',
			});

			const manualTrigger = mock<INode>({
				type: 'n8n-nodes-base.manualTrigger',
				name: 'When clicking ‘Execute workflow’',
			});

			const data = mock<IWorkflowExecutionDataProcess>({
				startNodes: [scheduleTrigger],
				triggerToStartFrom: undefined,
			});

			const workflow = mock<Workflow>({
				getTriggerNodes() {
					return [scheduleTrigger, manualTrigger];
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toBeUndefined();
		});
	});

	describe('runManually', () => {
		const nodeExecutionStack = mock<IExecuteData[]>();
		const waitingExecution = mock<IWaitingForExecution>();
		const waitingExecutionSource = mock<IWaitingForExecutionSource>();
		const mockFilteredGraph = mock<DirectedGraph>();

		beforeEach(() => {
			jest.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValue(mock<DirectedGraph>());
			jest.spyOn(core, 'WorkflowExecute').mockReturnValue(
				mock<WorkflowExecute>({
					processRunExecutionData: jest.fn().mockReturnValue(mock<PCancelable<IRun>>()),
				}),
			);
			jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValue({
				nodeExecutionStack,
				waitingExecution,
				waitingExecutionSource,
			});
			jest.spyOn(core, 'filterDisabledNodes').mockReturnValue(mockFilteredGraph);
		});

		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should correctly process triggerToStartFrom data when data.triggerToStartFrom.data is present', async () => {
			const mockTriggerData = mock<ITaskData>();
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const data = mock<IWorkflowExecutionDataProcess>({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
				pinData: undefined,
			});

			const startNode = mock<INode>({ name: startNodeName });
			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData: IPinData = {};

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);

			expect(DirectedGraph.fromWorkflow).toHaveBeenCalledWith(workflow);

			expect(recreateNodeExecutionStack).toHaveBeenCalledWith(
				mockFilteredGraph,
				new Set([startNode]),
				{ [triggerNodeName]: [mockTriggerData] },
				{},
			);

			expect(WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					resultData: {
						runData: { [triggerNodeName]: [mockTriggerData] },
						pinData,
					},
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack,
						waitingExecution,
						waitingExecutionSource,
					},
				}),
			);
		});

		it('should correctly include destinationNode in executionData when provided', async () => {
			const mockTriggerData = mock<ITaskData>();
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const destinationNodeName = 'destinationNode';
			const destinationNode: IDestinationNode = {
				nodeName: destinationNodeName,
				mode: 'inclusive',
			};

			const data = mock<IWorkflowExecutionDataProcess>({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
				destinationNode,
			});

			const startNode = mock<INode>({ name: startNodeName });
			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData: IPinData = {};

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);

			expect(WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					startData: { destinationNode },
					resultData: expect.any(Object),
					executionData: expect.any(Object),
				}),
			);
		});

		it('should call workflowExecute.run for full execution when no runData or startNodes', async () => {
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode: undefined,
				pinData: undefined,
				runData: undefined,
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn().mockReturnValue(null),
				getTriggerNodes: jest.fn().mockReturnValue([]),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(mockRun).toHaveBeenCalledWith({
				workflow,
				startNode: undefined,
				destinationNode: undefined,
				pinData: undefined,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [],
			});
		});

		it('should use execution start node when available for full execution', async () => {
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				pinData: {},
				startNodes: [],
				destinationNode: undefined,
				runData: undefined,
			});

			const startNode = mock<INode>({ name: 'startNode' });
			const workflow = mock<Workflow>({
				getNode: jest.fn().mockReturnValue(startNode),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const emptyPinData = {};

			jest.spyOn(manualExecutionService, 'getExecutionStartNode').mockReturnValue(startNode);

			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				emptyPinData,
			);

			expect(manualExecutionService.getExecutionStartNode).toHaveBeenCalledWith(data, workflow);

			expect(mockRun).toHaveBeenCalledWith({
				workflow,
				startNode,
				destinationNode: undefined,
				pinData: data.pinData,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [],
			});
		});

		it('should pass the triggerToStartFrom to workflowExecute.run for full execution', async () => {
			const mockTriggerData = mock<ITaskData>();
			const triggerNodeName = 'triggerNode';
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode: undefined,
				pinData: undefined,
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				runData: undefined,
			});

			const startNode = mock<INode>({ name: 'startNode' });
			const workflow = mock<Workflow>({
				getNode: jest.fn().mockReturnValue(startNode),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			jest.spyOn(manualExecutionService, 'getExecutionStartNode').mockReturnValue(startNode);

			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(mockRun).toHaveBeenCalledWith({
				workflow,
				startNode,
				destinationNode: undefined,
				pinData: undefined,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [],
			});
		});

		it('should not call `runPartialWorkflow2` when destinationNode is undefined', async () => {
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				runData: { node1: [{ data: { main: [[{ json: {} }]] } }] },
				startNodes: [{ name: 'node1' }],
				destinationNode: undefined,
				pinData: undefined,
			});

			const workflow = mock<Workflow>();

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			const mockRunPartialWorkflow = jest.fn().mockReturnValue('mockPartialReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow2: mockRunPartialWorkflow,
			}));

			await expect(
				async () =>
					await manualExecutionService.runManually(data, workflow, additionalData, executionId),
			).rejects.toThrowError(
				'a destinationNodeName is required for the new partial execution flow',
			);
			expect(mockRunPartialWorkflow).not.toHaveBeenCalled();
		});

		it('should handle partial execution', async () => {
			const mockRunData = { node1: [{ data: { main: [[{ json: {} }]] } }] };
			const dirtyNodeNames = ['node2', 'node3'];
			const destinationNodeName = 'destinationNode';
			const destinationNode: IDestinationNode = {
				nodeName: destinationNodeName,
				mode: 'inclusive',
			};
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [{ name: 'node1' }],
				dirtyNodeNames,
				destinationNode,
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => mock<INode>({ name })),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData: IPinData = { node1: [{ json: { pinned: true } }] };

			const mockRunPartialWorkflow2 = jest.fn().mockReturnValue('mockPartial2Return');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow2: mockRunPartialWorkflow2,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);

			expect(mockRunPartialWorkflow2).toHaveBeenCalled();
			expect(mockRunPartialWorkflow2.mock.calls[0][0]).toBe(workflow);
			expect(mockRunPartialWorkflow2.mock.calls[0][4]).toEqual(destinationNode);
		});

		it('should validate nodes exist before execution', async () => {
			const startNodeName = 'existingNode';
			const data = mock<IWorkflowExecutionDataProcess>({
				triggerToStartFrom: {
					name: 'triggerNode',
					data: mock<ITaskData>(),
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return mock<INode>({ name: startNodeName });
					return null;
				}),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(workflow.getNode).toHaveBeenCalledWith(startNodeName);
		});

		it('should handle pinData correctly when provided', async () => {
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const mockTriggerData = mock<ITaskData>();
			const mockPinData: IPinData = {
				[startNodeName]: [{ json: { pinned: true } }],
			};

			const data = mock<IWorkflowExecutionDataProcess>({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			});

			const startNode = mock<INode>({ name: startNodeName });
			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				mockPinData,
			);

			expect(WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					resultData: expect.objectContaining({
						pinData: mockPinData,
					}),
				}),
			);
		});
		it('should call runPartialWorkflow2 with runData and empty startNodes', async () => {
			const mockRunData = { nodeA: [{ data: { main: [[{ json: { value: 'test' } }]] } }] };
			const destinationNodeName = 'nodeB';
			const destinationNode: IDestinationNode = {
				nodeName: destinationNodeName,
				mode: 'inclusive',
			};
			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [],
				destinationNode,
				pinData: {},
				dirtyNodeNames: [],
				agentRequest: undefined,
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => mock<INode>({ name })),
			});

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-exec-id-v2-empty-start';

			const mockRunPartialWorkflow2 = jest.fn().mockReturnValue('mockPartial2Return-v2-empty');
			(core.WorkflowExecute as jest.Mock).mockImplementationOnce(() => ({
				runPartialWorkflow2: mockRunPartialWorkflow2,
				processRunExecutionData: jest.fn(),
				run: jest.fn(),
			}));

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				data.pinData,
			);

			expect(mockRunPartialWorkflow2).toHaveBeenCalledWith(
				workflow,
				mockRunData,
				data.pinData,
				data.dirtyNodeNames,
				destinationNode,
				data.agentRequest,
			);
		});
	});

	it('should call workflowExecute.run for full execution when execution mode is evaluation', async () => {
		const data = mock<IWorkflowExecutionDataProcess>({
			executionMode: 'evaluation',
			destinationNode: undefined,
			pinData: {},
			runData: {},
			triggerToStartFrom: undefined,
		});

		const workflow = mock<Workflow>({
			getNode: jest.fn().mockReturnValue(null),
			getTriggerNodes: jest.fn().mockReturnValue([]),
		});

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const executionId = 'test-execution-id-evaluation';

		const mockRun = jest.fn().mockReturnValue('mockRunReturnEvaluation');
		require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
			run: mockRun,
			processRunExecutionData: jest.fn(),
		}));

		await manualExecutionService.runManually(data, workflow, additionalData, executionId);

		expect(mockRun).toHaveBeenCalledWith({
			workflow,
			startNode: undefined,
			destinationNode: undefined,
			pinData: data.pinData,
			triggerToStartFrom: undefined,
			additionalRunFilterNodes: [],
		});
	});

	describe('tool partial execution', () => {
		const mockRewiredGraph = mock<DirectedGraph>();
		const mockRewiredWorkflow = mock<Workflow>();
		const mockGraphFromWorkflow = mock<DirectedGraph>();

		beforeEach(() => {
			jest.spyOn(core, 'rewireGraph').mockReturnValue(mockRewiredGraph);
			jest.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValue(mockGraphFromWorkflow);
			mockRewiredGraph.toWorkflow.mockImplementation(() => mockRewiredWorkflow);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should rewire graph and change destination to ToolExecutor when destination node is a tool', async () => {
			const toolNodeName = 'toolNode';
			const destinationNode: IDestinationNode = {
				nodeName: toolNodeName,
				mode: 'inclusive',
			};

			const toolNode = mock<INode>({
				name: toolNodeName,
				type: 'n8n-nodes-base.toolTest',
				typeVersion: 1,
			});

			const nodeTypeDescription = mock<INodeTypeDescription>({
				outputs: ['ai_tool'],
			});

			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode,
				pinData: undefined,
				runData: undefined,
				executionData: {
					startData: {},
				},
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === toolNodeName) return toolNode;
					return null;
				}),
				nodeTypes: mock({
					getByNameAndVersion: jest.fn().mockReturnValue(nodeTypeDescription),
				}),
				getParentNodes: jest.fn().mockReturnValue([]),
			});

			jest.spyOn(NodeHelpers, 'isTool').mockReturnValue(true);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id-tool';

			const mockRun = jest.fn().mockReturnValue('mockRunReturnTool');
			(core.WorkflowExecute as jest.Mock).mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			mockRewiredGraph.toWorkflow.mockImplementation(() => workflow);

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(core.rewireGraph).toHaveBeenCalledWith(
				toolNode,
				mockGraphFromWorkflow,
				data.agentRequest,
			);

			expect(mockRewiredGraph.toWorkflow).toHaveBeenCalledWith({
				...workflow,
			});

			expect(data.destinationNode).toEqual({
				nodeName: TOOL_EXECUTOR_NODE_NAME,
				mode: 'inclusive',
			});

			expect(data.executionData?.startData?.originalDestinationNode).toEqual(destinationNode);

			expect(mockRun).toHaveBeenCalledWith({
				workflow,
				startNode: undefined,
				destinationNode: { nodeName: TOOL_EXECUTOR_NODE_NAME, mode: 'inclusive' },
				pinData: undefined,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [],
			});
		});

		it('should add connected tools to additionalRunFilterNodes when tool is connected through HITL node', async () => {
			const toolNodeName = 'toolNode';
			const connectedTool1 = 'connectedTool1';
			const connectedTool2 = 'connectedTool2';

			const destinationNode: IDestinationNode = {
				nodeName: toolNodeName,
				mode: 'inclusive',
			};

			const toolNode = mock<INode>({
				name: toolNodeName,
				type: 'n8n-nodes-base.toolTest',
				typeVersion: 1,
			});

			const nodeTypeDescription = mock<INodeTypeDescription>({
				outputs: ['ai_tool'],
			});

			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode,
				pinData: undefined,
				runData: undefined,
				executionData: {
					startData: {},
				},
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === toolNodeName) return toolNode;
					return null;
				}),
				nodeTypes: mock({
					getByNameAndVersion: jest.fn().mockReturnValue(nodeTypeDescription),
				}),
				getParentNodes: jest.fn((nodeName) => {
					if (nodeName === TOOL_EXECUTOR_NODE_NAME) {
						return [connectedTool1, connectedTool2];
					}
					return [];
				}),
			});

			jest.spyOn(NodeHelpers, 'isTool').mockReturnValue(true);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id-tool-connected';

			const mockRun = jest.fn().mockReturnValue('mockRunReturnToolConnected');
			(core.WorkflowExecute as jest.Mock).mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			mockRewiredGraph.toWorkflow.mockImplementation(() => workflow);

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(workflow.getParentNodes).toHaveBeenCalledWith(TOOL_EXECUTOR_NODE_NAME, 'ALL_NON_MAIN');

			expect(mockRun).toHaveBeenCalledWith({
				workflow,
				startNode: undefined,
				destinationNode: { nodeName: TOOL_EXECUTOR_NODE_NAME, mode: 'inclusive' },
				pinData: undefined,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [connectedTool1, connectedTool2],
			});
		});

		it('should not rewire graph when destination node is not a tool', async () => {
			const regularNodeName = 'regularNode';
			const destinationNode: IDestinationNode = {
				nodeName: regularNodeName,
				mode: 'inclusive',
			};

			const regularNode = mock<INode>({
				name: regularNodeName,
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
			});

			const nodeTypeDescription = mock<INodeTypeDescription>({
				outputs: ['main'],
			});

			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode,
				pinData: undefined,
				runData: undefined,
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === regularNodeName) return regularNode;
					return null;
				}),
				nodeTypes: mock({
					getByNameAndVersion: jest.fn().mockReturnValue(nodeTypeDescription),
				}),
				getParentNodes: jest.fn().mockReturnValue([]),
			});

			jest.spyOn(NodeHelpers, 'isTool').mockReturnValue(false);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id-regular';

			const mockRun = jest.fn().mockReturnValue('mockRunReturnRegular');
			(core.WorkflowExecute as jest.Mock).mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			mockRewiredGraph.toWorkflow.mockImplementation(() => workflow);

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			expect(core.rewireGraph).not.toHaveBeenCalled();
			expect(data.destinationNode).toEqual(destinationNode);
			expect(mockRun).toHaveBeenCalledWith({
				workflow, // original workflow, not rewired
				startNode: undefined,
				destinationNode,
				pinData: undefined,
				triggerToStartFrom: data.triggerToStartFrom,
				additionalRunFilterNodes: [],
			});
		});

		it('should save originalDestinationNode even when executionData.startData is undefined', async () => {
			const toolNodeName = 'toolNode';
			const destinationNode: IDestinationNode = {
				nodeName: toolNodeName,
				mode: 'inclusive',
			};

			const toolNode = mock<INode>({
				name: toolNodeName,
				type: 'n8n-nodes-base.toolTest',
				typeVersion: 1,
			});

			const nodeTypeDescription = mock<INodeTypeDescription>({
				outputs: ['ai_tool'],
			});

			const data = mock<IWorkflowExecutionDataProcess>({
				executionMode: 'manual',
				destinationNode,
				pinData: undefined,
				runData: undefined,
				executionData: undefined,
			});

			const workflow = mock<Workflow>({
				getNode: jest.fn((name) => {
					if (name === toolNodeName) return toolNode;
					return null;
				}),
				nodeTypes: mock({
					getByNameAndVersion: jest.fn().mockReturnValue(nodeTypeDescription),
				}),
				getParentNodes: jest.fn().mockReturnValue([]),
			});

			jest.spyOn(NodeHelpers, 'isTool').mockReturnValue(true);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id-tool-no-exec-data';

			const mockRun = jest.fn().mockReturnValue('mockRunReturnToolNoExecData');
			(core.WorkflowExecute as jest.Mock).mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			mockRewiredGraph.toWorkflow.mockImplementation(() => workflow);

			await manualExecutionService.runManually(
				data as IWorkflowExecutionDataProcess,
				workflow,
				additionalData,
				executionId,
			);

			// When executionData is undefined, originalDestinationNode should not be saved
			expect(data.executionData).toBeUndefined();
			expect(data.destinationNode).toEqual({
				nodeName: TOOL_EXECUTOR_NODE_NAME,
				mode: 'inclusive',
			});
		});
	});
});
