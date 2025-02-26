import { mock } from 'jest-mock-extended';
import { DirectedGraph, WorkflowExecute } from 'n8n-core';
import type {
	Workflow,
	IWorkflowExecutionDataProcess,
	IWorkflowExecuteAdditionalData,
	IPinData,
} from 'n8n-workflow';

import { ManualExecutionService } from '@/manual-execution.service';

jest.mock('n8n-core', () => {
	const original = jest.requireActual('n8n-core');
	return {
		...original,
		WorkflowExecute: jest.fn().mockImplementation(() => ({
			processRunExecutionData: jest.fn().mockReturnValue('mockProcessReturn'),
		})),
		DirectedGraph: {
			fromWorkflow: jest.fn().mockReturnValue('mockGraph'),
		},
		recreateNodeExecutionStack: jest.fn().mockReturnValue({
			nodeExecutionStack: ['mockStack'],
			waitingExecution: {},
			waitingExecutionSource: {},
		}),
		filterDisabledNodes: jest.fn().mockReturnValue('mockFilteredGraph'),
	};
});

describe('ManualExecutionService', () => {
	const manualExecutionService = new ManualExecutionService(mock());

	describe('getExecutionStartNode', () => {
		it('Should return undefined', () => {
			const data = {
				pinData: {},
				startNodes: [],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					return {
						name: nodeName,
					};
				},
			} as unknown as Workflow;
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode).toBeUndefined();
		});

		it('Should return startNode', () => {
			const data = {
				pinData: {
					node1: {},
					node2: {},
				},
				startNodes: [{ name: 'node2' }],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					if (nodeName === 'node2') {
						return {
							name: 'node2',
						};
					}
					return undefined;
				},
			} as unknown as Workflow;
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode).toEqual({
				name: 'node2',
			});
		});

		it('Should return triggerToStartFrom trigger node', () => {
			const data = {
				pinData: {
					node1: {},
					node2: {},
				},
				triggerToStartFrom: { name: 'node3' },
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					return {
						name: nodeName,
					};
				},
			} as unknown as Workflow;
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode).toEqual({
				name: 'node3',
			});
		});
	});

	describe('runManually', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should correctly process triggerToStartFrom data when data.triggerToStartFrom.data is present', async () => {
			const mockTriggerData = { key: 'value' };
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const data = {
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			} as unknown as IWorkflowExecutionDataProcess;

			const startNode = { name: startNodeName };
			const workflow = {
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData = {} as IPinData;

			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);

			expect(DirectedGraph.fromWorkflow).toHaveBeenCalledWith(workflow);

			expect(require('n8n-core').recreateNodeExecutionStack).toHaveBeenCalledWith(
				'mockFilteredGraph',
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
						nodeExecutionStack: ['mockStack'],
						waitingExecution: {},
						waitingExecutionSource: {},
					},
				}),
			);
		});

		it('should correctly include destinationNode in executionData when provided', async () => {
			const mockTriggerData = { key: 'value' };
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const destinationNodeName = 'destinationNode';

			const data = {
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
				destinationNode: destinationNodeName,
			} as unknown as IWorkflowExecutionDataProcess;

			const startNode = { name: startNodeName };
			const workflow = {
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData = {} as IPinData;

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
					startData: {
						destinationNode: destinationNodeName,
					},
					resultData: expect.any(Object),
					executionData: expect.any(Object),
				}),
			);
		});

		it('should call workflowExecute.run for full execution when no runData or startNodes', async () => {
			const data = {
				executionMode: 'manual',
			} as unknown as IWorkflowExecutionDataProcess;

			const workflow = {
				getNode: jest.fn().mockReturnValue(null),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(data, workflow, additionalData, executionId);

			expect(mockRun).toHaveBeenCalledWith(
				workflow,
				undefined, // startNode
				undefined, // destinationNode
				undefined, // pinData
			);
		});

		it('should use execution start node when available for full execution', async () => {
			const data = {
				executionMode: 'manual',
				pinData: {},
				startNodes: [],
			} as unknown as IWorkflowExecutionDataProcess;

			const startNode = { name: 'startNode' };
			const workflow = {
				getNode: jest.fn().mockReturnValue(startNode),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const emptyPinData = {};

			jest.spyOn(manualExecutionService, 'getExecutionStartNode').mockReturnValue(startNode as any);

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

			expect(mockRun).toHaveBeenCalledWith(
				workflow,
				startNode, // startNode
				undefined, // destinationNode
				emptyPinData, // pinData
			);
		});

		it('should handle partial execution with provided runData, startNodes and no destinationNode', async () => {
			const mockRunData = { node1: [{ data: { main: [[{ json: {} }]] } }] };
			const startNodeName = 'node1';
			const data = {
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [{ name: startNodeName }],
			} as unknown as IWorkflowExecutionDataProcess;

			const workflow = {
				getNode: jest.fn((name) => {
					if (name === startNodeName) return { name: startNodeName };
					return null;
				}),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			const mockRunPartialWorkflow = jest.fn().mockReturnValue('mockPartialReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow: mockRunPartialWorkflow,
				processRunExecutionData: jest.fn(),
			}));

			await manualExecutionService.runManually(data, workflow, additionalData, executionId);

			expect(mockRunPartialWorkflow).toHaveBeenCalledWith(
				workflow,
				mockRunData,
				data.startNodes,
				undefined, // destinationNode
				undefined, // pinData
			);
		});

		it('should handle partial execution with partialExecutionVersion=2', async () => {
			const mockRunData = { node1: [{ data: { main: [[{ json: {} }]] } }] };
			const dirtyNodeNames = ['node2', 'node3'];
			const destinationNodeName = 'destinationNode';
			const data = {
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [{ name: 'node1' }],
				partialExecutionVersion: 2,
				dirtyNodeNames,
				destinationNode: destinationNodeName,
			} as unknown as IWorkflowExecutionDataProcess;

			const workflow = {
				getNode: jest.fn((name) => ({ name })),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';
			const pinData = { node1: [{ json: { pinned: true } }] } as IPinData;

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
			expect(mockRunPartialWorkflow2.mock.calls[0][4]).toBe(destinationNodeName);
		});

		it('should validate nodes exist before execution', async () => {
			const startNodeName = 'existingNode';
			const data = {
				triggerToStartFrom: {
					name: 'triggerNode',
					data: { key: 'value' },
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			} as unknown as IWorkflowExecutionDataProcess;

			const workflow = {
				getNode: jest.fn((name) => {
					if (name === startNodeName) return { name: startNodeName };
					return null;
				}),
			} as unknown as Workflow;

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const executionId = 'test-execution-id';

			await manualExecutionService.runManually(data, workflow, additionalData, executionId);

			expect(workflow.getNode).toHaveBeenCalledWith(startNodeName);
		});

		it('should handle pinData correctly when provided', async () => {
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const mockTriggerData = { key: 'value' };
			const mockPinData = {
				[startNodeName]: [{ json: { pinned: true } }],
			} as IPinData;

			const data = {
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			} as unknown as IWorkflowExecutionDataProcess;

			const startNode = { name: startNodeName };
			const workflow = {
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			} as unknown as Workflow;

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
	});
});
