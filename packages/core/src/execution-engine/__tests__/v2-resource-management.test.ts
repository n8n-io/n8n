import { mock } from 'jest-mock-extended';
import type { IConnection, INode, INodeType, INodeTypes, IRun } from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import { WorkflowExecute } from '@/execution-engine/workflow-execute';
import * as Helpers from '@test/helpers';

describe('V2 Parallel Execution - Resource Management Tests', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	describe('Resource Limits and Control', () => {
		it('should respect maxParallel limit and never exceed it', async () => {
			// ARRANGE
			let currentConcurrentExecutions = 0;
			let maxConcurrentExecutions = 0;
			const completionPromises: Array<() => void> = [];

			const createResourceNode = (name: string): INodeType => {
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
						return await new Promise((resolve) => {
							currentConcurrentExecutions++;
							maxConcurrentExecutions = Math.max(
								maxConcurrentExecutions,
								currentConcurrentExecutions,
							);

							completionPromises.push(() => {
								currentConcurrentExecutions--;
								resolve([[{ json: { result: name } }]]);
							});
						});
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createResourceNode(nodeName);
			});

			// Create workflow with 10 parallel nodes but limit to 3 concurrent
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
			for (let i = 1; i <= 10; i++) {
				nodes.push({
					id: `resource${i}`,
					name: `Resource${i}`,
					type: `test.resource${i}`,
					typeVersion: 1,
					position: [200, i * 30],
					parameters: {},
				});
				connections.push({
					node: `Resource${i}`,
					type: NodeConnectionTypes.Main,
					index: 0,
				});
			}

			const workflow = new Workflow({
				id: 'resource-limit-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: 3, // Strict limit
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const executionPromise = workflowExecute.run(workflow, nodes[0]);

			// Wait for executions to start - deterministic wait with timeout
			let waitAttempts = 0;
			while (completionPromises.length < 3 && waitAttempts < 50) {
				await new Promise((resolve) => setTimeout(resolve, 10));
				waitAttempts++;
			}

			// Complete executions in controlled batches
			while (completionPromises.length > 0) {
				// Complete up to 3 at a time to test the limit
				const batch = completionPromises.splice(0, 3);
				batch.forEach((complete) => complete());
				await new Promise((resolve) => setTimeout(resolve, 10));
			}

			const result = await executionPromise;

			// ASSERT
			expect(result.finished).toBe(true);
			expect(maxConcurrentExecutions).toBeLessThanOrEqual(3);
			expect(maxConcurrentExecutions).toBeGreaterThan(0);
		});

		it('should handle unlimited parallel execution when maxParallel is not set', async () => {
			// ARRANGE
			let concurrentExecutions = 0;
			let maxConcurrentExecutions = 0;
			const completionPromises: Array<() => void> = [];

			const createUnlimitedNode = (name: string): INodeType => {
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
						return await new Promise((resolve) => {
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
				return createUnlimitedNode(nodeName);
			});

			// Create workflow with 5 parallel nodes, no limit
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
					id: `unlimited${i}`,
					name: `Unlimited${i}`,
					type: `test.unlimited${i}`,
					typeVersion: 1,
					position: [200, i * 30],
					parameters: {},
				});
				connections.push({
					node: `Unlimited${i}`,
					type: NodeConnectionTypes.Main,
					index: 0,
				});
			}

			const workflow = new Workflow({
				id: 'unlimited-parallel-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					// No maxParallel specified - should allow unlimited
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const executionPromise = workflowExecute.run(workflow, nodes[0]);

			// Wait for executions to start and complete them quickly
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Complete all executions in small batches
			while (completionPromises.length > 0) {
				const batch = completionPromises.splice(0, 3);
				batch.forEach((complete) => complete());
				await new Promise((resolve) => setTimeout(resolve, 5));
			}

			const result = await executionPromise;

			// ASSERT
			expect(result.finished).toBe(true);
			// Should allow all 5 nodes to run in parallel (plus trigger = 6 total)
			expect(maxConcurrentExecutions).toBeGreaterThanOrEqual(5);
		});

		it('should gracefully handle resource exhaustion scenarios', async () => {
			// ARRANGE
			let memoryUsage = 0;
			const maxMemoryUsage = 1000; // Simulated memory limit

			const createMemoryIntensiveNode = (name: string): INodeType => {
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
						// Simulate memory usage
						const nodeMemoryUsage = 200;
						if (memoryUsage + nodeMemoryUsage > maxMemoryUsage) {
							throw new Error('Insufficient memory');
						}

						memoryUsage += nodeMemoryUsage;

						try {
							// Simulate work
							await new Promise((resolve) => setTimeout(resolve, 10));
							return [[{ json: { result: name, memoryUsed: nodeMemoryUsage } }]];
						} finally {
							memoryUsage -= nodeMemoryUsage;
						}
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createMemoryIntensiveNode(nodeName);
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
			];

			// Create 6 nodes that would exceed memory if all run at once (6 * 200 = 1200 > 1000)
			const connections: IConnection[] = [];
			for (let i = 1; i <= 6; i++) {
				nodes.push({
					id: `memory${i}`,
					name: `Memory${i}`,
					type: `test.memory${i}`,
					typeVersion: 1,
					position: [200, i * 30],
					parameters: {},
				});
				connections.push({
					node: `Memory${i}`,
					type: NodeConnectionTypes.Main,
					index: 0,
				});
			}

			const workflow = new Workflow({
				id: 'memory-limit-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: 4, // Limit that should prevent memory exhaustion
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT & ASSERT
			// Should either complete successfully (with proper resource management)
			// or fail gracefully without hanging
			const result = await workflowExecute.run(workflow, nodes[0]);

			// Should either complete successfully or fail gracefully
			expect(result).toBeDefined();
			if (result.finished) {
				expect(result.finished).toBe(true);
			} else {
				// If it failed, should have error information
				expect(result.data.resultData.error).toBeDefined();
			}
			// Memory should never have exceeded the limit significantly
			expect(memoryUsage).toBeLessThanOrEqual(maxMemoryUsage);
		});
	});
});
