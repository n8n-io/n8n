import { mock } from 'jest-mock-extended';
import type {
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData } from '../partial-execution-utils/__tests__/helpers';
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
});
