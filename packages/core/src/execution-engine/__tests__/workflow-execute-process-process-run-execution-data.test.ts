import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData, toITaskData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';
import { types, nodeTypes } from './mock-node-types';

describe('processRunExecutionData', () => {
	const runHook = jest.fn().mockResolvedValue(undefined);
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: { runHook },
		restartExecutionId: undefined,
	});
	const executionMode: WorkflowExecuteMode = 'trigger';

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test('throws if execution-data is missing', () => {
		// ARRANGE
		const node = createNodeData({ name: 'passThrough', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node)
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node.name, sourceData: null }] },
			resultData: { runData: {} },
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT & ASSERT
		// The function returns a Promise, but throws synchronously, so we can't await it.
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		expect(() => workflowExecute.processRunExecutionData(workflow)).toThrowError(
			new ApplicationError('Failed to run workflow due to missing execution data'),
		);
	});

	test('returns input data verbatim', async () => {
		// ARRANGE
		const node = createNodeData({ name: 'node', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node)
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node.name, sourceData: null }] },
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT
		const result = await workflowExecute.processRunExecutionData(workflow);

		// ASSERT
		expect(result.data.resultData.runData).toMatchObject({ node: [{ data: taskDataConnection }] });
	});

	test('calls the right hooks in the right order', async () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'node1', type: types.passThrough });
		const node2 = createNodeData({ name: 'node2', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node1, node2)
			.addConnections({ from: node1, to: node2 })
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node1.name, sourceData: null }] },
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [{ data: taskDataConnection, node: node1, source: null }],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT
		await workflowExecute.processRunExecutionData(workflow);

		// ASSERT
		expect(runHook).toHaveBeenCalledTimes(6);
		expect(runHook).toHaveBeenNthCalledWith(1, 'workflowExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(2, 'nodeExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(3, 'nodeExecuteAfter', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(4, 'nodeExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(5, 'nodeExecuteAfter', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(6, 'workflowExecuteAfter', expect.any(Array));
	});

	describe('runExecutionData.waitTill', () => {
		test('handles waiting state properly when waitTill is set', async () => {
			// ARRANGE
			const node = createNodeData({ name: 'waitingNode', type: types.passThrough });
			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const data: IDataObject = { foo: 1 };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: {
					runData: { waitingNode: [toITaskData([{ data }], { executionStatus: 'waiting' })] },
					lastNodeExecuted: 'waitingNode',
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: { main: [[{ json: data }]] }, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				waitTill: new Date('2024-01-01'),
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			expect(result.waitTill).toBeUndefined();
			// The waiting state handler should have removed the last entry from
			// runData, but execution adds a new one, so we should have 1 entry.
			expect(result.data.resultData.runData.waitingNode).toHaveLength(1);
			// the status was `waiting` before
			expect(result.data.resultData.runData.waitingNode[0].executionStatus).toEqual('success');
		});
	});

	describe('workflow issues', () => {
		test('throws if workflow contains nodes with missing required properties', () => {
			// ARRANGE
			const node = createNodeData({ name: 'node', type: types.testNodeWithRequiredProperty });
			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT & ASSERT
			// The function returns a Promise, but throws synchronously, so we can't await it.
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			expect(() => workflowExecute.processRunExecutionData(workflow)).toThrowError(
				new ApplicationError(
					'The workflow has issues and cannot be executed for that reason. Please fix them first.',
				),
			);
		});

		test('does not complain about nodes with issue past the destination node', async () => {
			// ARRANGE
			const node1 = createNodeData({ name: 'node1', type: types.passThrough });
			const node2 = createNodeData({ name: 'node2', type: types.testNodeWithRequiredProperty });
			const workflow = new DirectedGraph()
				.addNodes(node1, node2)
				.addConnection({ from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
			const executionData: IRunExecutionData = {
				startData: {
					startNodes: [{ name: node1.name, sourceData: null }],
					destinationNode: node1.name,
				},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node: node1, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT & ASSERT
			// The function returns a Promise, but throws synchronously, so we can't await it.
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			expect(() => workflowExecute.processRunExecutionData(workflow)).not.toThrowError();
		});
	});
});
