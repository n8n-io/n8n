import { mock } from 'jest-mock-extended';
import type {
	IConnection,
	INode,
	INodeType,
	INodeTypes,
	IRun,
	IExecuteFunctions,
} from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';
import { WorkflowExecute } from '@/execution-engine/workflow-execute';

describe('WorkflowExecute - V2 Parallel Execution', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	it('should execute nodes in parallel when executionOrder is v2', async () => {
		// ARRANGE
		const executionOrder: string[] = [];

		const createTrackingNode = (name: string): INodeType => {
			return mock<INodeType>({
				description: {
					name: `test.${name.toLowerCase()}`,
					displayName: name,
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute(this: IExecuteFunctions) {
					executionOrder.push(name);
					return [[{ json: { result: name } }]];
				},
			});
		};

		nodeTypes.getByNameAndVersion.mockImplementation((name) => {
			const nodeName = name.replace('test.', '');
			return createTrackingNode(nodeName);
		});

		const nodes: INode[] = [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'test.trigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'branch1',
				name: 'Branch1',
				type: 'test.branch1',
				typeVersion: 1,
				position: [200, -100],
				parameters: {},
			},
			{
				id: 'branch2',
				name: 'Branch2',
				type: 'test.branch2',
				typeVersion: 1,
				position: [200, 100],
				parameters: {},
			},
		];

		const connections: IConnection[] = [
			{ node: 'Branch1', type: NodeConnectionTypes.Main, index: 0 },
			{ node: 'Branch2', type: NodeConnectionTypes.Main, index: 0 },
		];

		const workflow = new Workflow({
			id: 'v2-parallel-test',
			nodes,
			connections: {
				Trigger: { [NodeConnectionTypes.Main]: [connections] },
			},
			active: false,
			nodeTypes,
			settings: {
				executionOrder: 'v2' as any, // V2 parallel execution mode
				maxParallel: 2,
			},
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		// ACT
		const result = await workflowExecute.run(workflow, nodes[0]);

		// ASSERT
		expect(result.finished).toBe(true);
		expect(executionOrder).toContain('trigger');
		expect(executionOrder).toContain('branch1');
		expect(executionOrder).toContain('branch2');
		expect(executionOrder.length).toBe(3);
	});

	it('should maintain backward compatibility - v1 execution should work unchanged', async () => {
		// ARRANGE
		const executionOrder: string[] = [];

		const createSequentialNode = (name: string): INodeType => {
			return mock<INodeType>({
				description: {
					name: `test.${name.toLowerCase()}`,
					displayName: name,
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					executionOrder.push(name);
					return [[{ json: { result: name } }]];
				},
			});
		};

		nodeTypes.getByNameAndVersion.mockImplementation((name) => {
			const nodeName = name.replace('test.', '');
			return createSequentialNode(nodeName);
		});

		const nodes: INode[] = [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'test.trigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'node1',
				name: 'Node1',
				type: 'test.node1',
				typeVersion: 1,
				position: [200, -50],
				parameters: {},
			},
			{
				id: 'node2',
				name: 'Node2',
				type: 'test.node2',
				typeVersion: 1,
				position: [200, 50],
				parameters: {},
			},
		];

		const workflow = new Workflow({
			id: 'v1-sequential-test',
			nodes,
			connections: {
				Trigger: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
			active: false,
			nodeTypes,
			settings: {
				executionOrder: 'v1', // V1 sequential execution mode
			},
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		// ACT
		const result = await workflowExecute.run(workflow, nodes[0]);

		// ASSERT
		expect(result.finished).toBe(true);
		expect(executionOrder).toEqual(['trigger', 'node1', 'node2']);
	});

	it('should respect maxParallel limit in v2 mode', async () => {
		// ARRANGE
		let concurrentExecutions = 0;
		let maxConcurrentExecutions = 0;
		const completionPromises: Array<() => void> = [];

		const createLimitedNode = (name: string): INodeType => {
			return mock<INodeType>({
				description: {
					name: `test.${name.toLowerCase()}`,
					displayName: name,
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					return new Promise((resolve) => {
						concurrentExecutions++;
						maxConcurrentExecutions = Math.max(maxConcurrentExecutions, concurrentExecutions);

						completionPromises.push(() => {
							concurrentExecutions--;
							resolve([[{ json: { result: name } }]]);
						});
					});
				},
			});
		};

		nodeTypes.getByNameAndVersion.mockImplementation((name) => {
			const nodeName = name.replace('test.', '');
			return createLimitedNode(nodeName);
		});

		// Create 5 parallel nodes but limit to 2 concurrent
		const nodes: INode[] = [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'test.trigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		const connections: IConnection[] = [];
		for (let i = 1; i <= 5; i++) {
			nodes.push({
				id: `node${i}`,
				name: `Node${i}`,
				type: `test.node${i}`,
				typeVersion: 1,
				position: [200, i * 50],
				parameters: {},
			});
			connections.push({
				node: `Node${i}`,
				type: NodeConnectionTypes.Main,
				index: 0,
			});
		}

		const workflow = new Workflow({
			id: 'v2-limit-test',
			nodes,
			connections: {
				Trigger: { [NodeConnectionTypes.Main]: [connections] },
			},
			active: false,
			nodeTypes,
			settings: {
				executionOrder: 'v2' as any,
				maxParallel: 2, // Limit to 2 concurrent executions
			},
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		// ACT
		const executionPromise = workflowExecute.run(workflow, nodes[0]);

		// Wait for executions to start
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Complete executions in batches to test the limit
		while (completionPromises.length > 0) {
			const batch = completionPromises.splice(0, 2);
			batch.forEach((complete) => complete());
			await new Promise((resolve) => setTimeout(resolve, 10));
		}

		const result = await executionPromise;

		// ASSERT
		expect(result.finished).toBe(true);
		expect(maxConcurrentExecutions).toBeLessThanOrEqual(2);
	});
});
