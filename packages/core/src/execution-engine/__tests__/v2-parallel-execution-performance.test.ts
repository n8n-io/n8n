import { mock } from 'jest-mock-extended';
import type { INode, INodeType, INodeTypes, IRun } from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

describe('V2 Parallel Execution Performance', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	it('should demonstrate performance improvement over sequential execution', async () => {
		// Create timed nodes that simulate real processing
		const createTimedNode = (name: string, processingTime: number): INodeType => {
			return mock<INodeType>({
				description: {
					name: `test.${name}`,
					displayName: name,
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					// Simulate processing time
					await new Promise((resolve) => setTimeout(resolve, processingTime));
					return [[{ json: { result: name, processingTime } }]];
				},
			});
		};

		nodeTypes.getByNameAndVersion.mockImplementation((name) => {
			const nodeName = name.replace('test.', '');
			switch (nodeName) {
				case 'trigger':
					return createTimedNode('trigger', 10);
				case 'task1':
					return createTimedNode('task1', 100);
				case 'task2':
					return createTimedNode('task2', 100);
				case 'task3':
					return createTimedNode('task3', 100);
				default:
					throw new Error(`Unknown node type: ${name}`);
			}
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
				id: 'task1',
				name: 'Task1',
				type: 'test.task1',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			},
			{
				id: 'task2',
				name: 'Task2',
				type: 'test.task2',
				typeVersion: 1,
				position: [200, 100],
				parameters: {},
			},
			{
				id: 'task3',
				name: 'Task3',
				type: 'test.task3',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		];

		// Test sequential execution (v1)
		const sequentialWorkflow = new Workflow({
			id: 'sequential-test',
			nodes,
			connections: {
				Trigger: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Task1', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Task2', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Task3', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
			active: false,
			nodeTypes,
			settings: { executionOrder: 'v1' },
		});

		const sequentialStart = Date.now();
		const waitPromise1 = createDeferredPromise<IRun>();
		const additionalData1 = Helpers.WorkflowExecuteAdditionalData(waitPromise1);
		const sequentialExecute = new WorkflowExecute(additionalData1, 'manual');
		const sequentialResult = await sequentialExecute.run(sequentialWorkflow, nodes[0]);
		const sequentialDuration = Date.now() - sequentialStart;

		// Test parallel execution (v2)
		const parallelWorkflow = new Workflow({
			id: 'parallel-test',
			nodes,
			connections: {
				Trigger: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'Task1', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Task2', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'Task3', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
			active: false,
			nodeTypes,
			settings: { executionOrder: 'v2', maxParallel: 3 },
		});

		const parallelStart = Date.now();
		const waitPromise2 = createDeferredPromise<IRun>();
		const additionalData2 = Helpers.WorkflowExecuteAdditionalData(waitPromise2);
		const parallelExecute = new WorkflowExecute(additionalData2, 'manual');
		const parallelResult = await parallelExecute.run(parallelWorkflow, nodes[0]);
		const parallelDuration = Date.now() - parallelStart;

		// Performance assertions
		expect(sequentialResult.finished).toBe(true);
		expect(parallelResult.finished).toBe(true);

		// Parallel should be significantly faster
		// Sequential: ~310ms (10 + 100 + 100 + 100), Parallel: ~110ms (10 + max(100,100,100))
		expect(parallelDuration).toBeLessThan(sequentialDuration * 0.8);

		// Performance budget: parallel execution should complete within reasonable time
		expect(parallelDuration).toBeLessThan(200); // 200ms budget for this test

		// Both should produce the same results
		expect(Object.keys(sequentialResult.data.resultData.runData)).toEqual(
			Object.keys(parallelResult.data.resultData.runData),
		);
	});
});
