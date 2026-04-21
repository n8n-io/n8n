import { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import * as core from 'n8n-core';
import { DirectedGraph, WorkflowExecute, recreateNodeExecutionStack } from 'n8n-core';
import type {
	Workflow,
	IWorkflowExecutionDataProcess,
	IWorkflowExecuteAdditionalData,
	ITaskData,
	INode,
	INodeExecutionData,
	INodeTypeDescription,
	IConnections,
	IExecuteData,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	IRun,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import { ManualExecutionService } from '@/manual-execution.service';

jest.mock('n8n-core');

/**
 * Regression test for GHC-7722
 *
 * Bug: When importing execution data that contains multiple JSON items into a
 * trigger-based workflow, the workflow only executes once instead of processing
 * each item individually.
 *
 * Expected: Each item from the trigger should be processed by downstream nodes
 * Actual: Only one item is processed
 */
describe('ManualExecutionService - Trigger with Multiple Items (GHC-7722)', () => {
	const logger = mock<Logger>();
	const manualExecutionService = new ManualExecutionService(logger);
	const mockFilteredGraph = mock<DirectedGraph>();

	beforeEach(() => {
		jest.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValue(mock<DirectedGraph>());
		jest.spyOn(core, 'filterDisabledNodes').mockReturnValue(mockFilteredGraph);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should process all items from trigger node when executing with imported execution data', async () => {
		// Setup: Create a trigger node with 2 items in its output
		const triggerNodeName = 'Google Drive Trigger';
		const codeNodeName = 'Code';

		// Mock trigger node
		const triggerNode = mock<INode>({
			name: triggerNodeName,
			type: 'n8n-nodes-base.googleDriveTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		});

		// Mock code node that processes the trigger output
		const codeNode = mock<INode>({
			name: codeNodeName,
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [450, 300],
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: 'return items;',
			},
		});

		// Create workflow with trigger -> code connection
		const connections: IConnections = {
			[triggerNodeName]: {
				main: [[{ node: codeNodeName, type: 'main', index: 0 }]],
			},
		};

		const workflow = mock<Workflow>({
			name: 'Test Workflow',
			nodes: [triggerNode, codeNode],
			connections,
			getNode: jest.fn((name: string) => {
				if (name === triggerNodeName) return triggerNode;
				if (name === codeNodeName) return codeNode;
				return null;
			}),
			getParentNodes: jest.fn(() => []),
			nodeTypes: mock({
				getByNameAndVersion: jest.fn((type: string) => {
					if (type === 'n8n-nodes-base.googleDriveTrigger') {
						return mock<INodeTypeDescription>({
							name: 'n8n-nodes-base.googleDriveTrigger',
							displayName: 'Google Drive Trigger',
							group: ['trigger'],
							outputs: ['main'],
						});
					}
					return mock<INodeTypeDescription>({
						name: type,
						outputs: ['main'],
					});
				}),
			}),
		});

		// Create trigger data with 2 items (simulating imported execution data)
		const triggerOutputItems: INodeExecutionData[] = [
			{
				json: {
					id: '1',
					name: 'Document 1',
					mimeType: 'application/pdf',
				},
			},
			{
				json: {
					id: '2',
					name: 'Document 2',
					mimeType: 'application/pdf',
				},
			},
		];

		const triggerTaskData: ITaskData = {
			startTime: Date.now(),
			executionTime: 100,
			executionStatus: 'success',
			data: {
				main: [triggerOutputItems], // 2 items from trigger
			},
		};

		// Setup execution data with triggerToStartFrom (as happens during manual execution with imported data)
		const executionData: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData: {
				id: 'test-workflow-id',
				name: 'Test Workflow',
				nodes: [triggerNode, codeNode],
				connections,
				active: false,
				settings: {},
			},
			triggerToStartFrom: {
				name: triggerNodeName,
				data: triggerTaskData,
			},
			startNodes: [{ name: codeNodeName }], // Start execution from code node
		};

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const executionId = 'test-execution-ghc-7722';

		// Mock recreateNodeExecutionStack to simulate the workflow execution state
		const nodeExecutionStack: IExecuteData[] = [
			{
				node: codeNode,
				data: {
					main: [triggerOutputItems], // Should receive all 2 items from trigger
				},
				source: {
					main: [
						{
							previousNode: triggerNodeName,
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
		];
		const waitingExecution = mock<IWaitingForExecution>();
		const waitingExecutionSource = mock<IWaitingForExecutionSource>();

		jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValue({
			nodeExecutionStack,
			waitingExecution,
			waitingExecutionSource,
		});

		// Mock WorkflowExecute
		const executionResult: IRun = {
			data: {
				resultData: {
					runData: {
						[triggerNodeName]: [triggerTaskData],
						[codeNodeName]: [
							{
								startTime: Date.now(),
								executionTime: 50,
								executionStatus: 'success',
								data: {
									main: [triggerOutputItems], // Should receive all 2 items
								},
							},
						],
					},
				},
			},
			finished: true,
			mode: 'manual',
			startedAt: new Date(),
		};

		jest.spyOn(core, 'WorkflowExecute').mockReturnValue(
			mock<WorkflowExecute>({
				processRunExecutionData: jest.fn().mockReturnValue(executionResult as PCancelable<IRun>),
			}),
		);

		// Act: Run the workflow manually
		await manualExecutionService.runManually(
			executionData,
			workflow,
			additionalData,
			executionId,
		);

		// Assert: Verify that recreateNodeExecutionStack was called with trigger data
		expect(core.recreateNodeExecutionStack).toHaveBeenCalledWith(
			mockFilteredGraph,
			new Set([codeNode]),
			{ [triggerNodeName]: [triggerTaskData] },
			{},
		);

		// Verify that the node execution stack includes the correct data from trigger
		// The bug is that the execution stack will have dummy data [{ json: {} }] instead of the actual trigger items
		expect(nodeExecutionStack).toHaveLength(1);
		expect(nodeExecutionStack[0].node).toBe(codeNode);

		// THIS IS THE FAILING ASSERTION - demonstrates the bug
		// Expected: triggerOutputItems (2 items from imported execution)
		// Actual: dummy data [{ json: {} }] (only 1 item)
		expect(nodeExecutionStack[0].data.main?.[0]).toEqual(triggerOutputItems);
		expect(nodeExecutionStack[0].data.main?.[0]).toHaveLength(2);
	});

	it('should process single item from trigger node correctly', async () => {
		// This test should pass - single item case works
		const triggerNodeName = 'Webhook Trigger';
		const setNodeName = 'Set';

		const triggerNode = mock<INode>({
			name: triggerNodeName,
			type: 'n8n-nodes-base.webhookTrigger',
			typeVersion: 1,
		});

		const setNode = mock<INode>({
			name: setNodeName,
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
		});

		const connections: IConnections = {
			[triggerNodeName]: {
				main: [[{ node: setNodeName, type: 'main', index: 0 }]],
			},
		};

		const workflow = mock<Workflow>({
			nodes: [triggerNode, setNode],
			connections,
			getNode: jest.fn((name: string) => {
				if (name === triggerNodeName) return triggerNode;
				if (name === setNodeName) return setNode;
				return null;
			}),
			getParentNodes: jest.fn(() => []),
			nodeTypes: mock({
				getByNameAndVersion: jest.fn(() =>
					mock<INodeTypeDescription>({ outputs: ['main'] }),
				),
			}),
		});

		const singleItem: INodeExecutionData[] = [
			{
				json: {
					id: 'single',
					value: 'test',
				},
			},
		];

		const triggerTaskData: ITaskData = {
			startTime: Date.now(),
			executionTime: 50,
			executionStatus: 'success',
			data: {
				main: [singleItem],
			},
		};

		const executionData: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData: {
				id: 'test-workflow-id-single',
				name: 'Test Single Item',
				nodes: [triggerNode, setNode],
				connections,
				active: false,
				settings: {},
			},
			triggerToStartFrom: {
				name: triggerNodeName,
				data: triggerTaskData,
			},
			startNodes: [{ name: setNodeName }],
		};

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const executionId = 'test-execution-single-item';

		// Mock recreateNodeExecutionStack
		const singleNodeExecutionStack: IExecuteData[] = [
			{
				node: setNode,
				data: {
					main: [singleItem],
				},
				source: {
					main: [
						{
							previousNode: triggerNodeName,
							previousNodeOutput: 0,
							previousNodeRun: 0,
						},
					],
				},
			},
		];

		jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValue({
			nodeExecutionStack: singleNodeExecutionStack,
			waitingExecution: mock<IWaitingForExecution>(),
			waitingExecutionSource: mock<IWaitingForExecutionSource>(),
		});

		jest.spyOn(core, 'WorkflowExecute').mockReturnValue(
			mock<WorkflowExecute>({
				processRunExecutionData: jest.fn().mockReturnValue(
					mock<PCancelable<IRun>>({
						data: {
							resultData: {
								runData: {
									[triggerNodeName]: [triggerTaskData],
									[setNodeName]: [
										{
											startTime: Date.now(),
											executionTime: 30,
											executionStatus: 'success',
											data: {
												main: [singleItem],
											},
										},
									],
								},
							},
						},
						finished: true,
						mode: 'manual',
						startedAt: new Date(),
					}),
				),
			}),
		);

		await manualExecutionService.runManually(
			executionData,
			workflow,
			additionalData,
			executionId,
		);

		expect(core.recreateNodeExecutionStack).toHaveBeenCalledWith(
			mockFilteredGraph,
			new Set([setNode]),
			{ [triggerNodeName]: [triggerTaskData] },
			{},
		);

		// Single item case should work correctly
		expect(singleNodeExecutionStack[0].data.main?.[0]).toHaveLength(1);
		expect(singleNodeExecutionStack[0].data.main?.[0]).toEqual(singleItem);
	});
});
