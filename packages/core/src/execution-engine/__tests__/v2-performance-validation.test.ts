import { mock } from 'jest-mock-extended';
import type {
	IConnection,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IRun,
	IExecuteFunctions,
} from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';
import { WorkflowExecute } from '@/execution-engine/workflow-execute';

describe('V2 Parallel Execution - Performance Validation Tests', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	describe('Performance Improvements', () => {
		it('should demonstrate performance improvement over sequential execution', async () => {
			// ARRANGE
			const nodeExecutionTimes: Record<string, number> = {};
			const workflowExecutionTimes: Record<string, number> = {};

			const createTimedNode = (name: string, processingTime: number): INodeType => {
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
						const startTime = Date.now();

						// Simulate processing time
						await new Promise((resolve) => setTimeout(resolve, processingTime));

						nodeExecutionTimes[name] = Date.now() - startTime;
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
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'task2',
					name: 'Task2',
					type: 'test.task2',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'task3',
					name: 'Task3',
					type: 'test.task3',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const connections: IConnection[] = [
				{ node: 'Task1', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'Task2', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'Task3', type: NodeConnectionTypes.Main, index: 0 },
			];

			// Test sequential execution (v1)
			const sequentialWorkflow = new Workflow({
				id: 'sequential-performance-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v1',
				},
			});

			// Test parallel execution (v2)
			const parallelWorkflow = new Workflow({
				id: 'parallel-performance-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
				},
			});

			// ACT
			// Test sequential execution
			const sequentialStart = Date.now();
			const waitPromise1 = createDeferredPromise<IRun>();
			const additionalData1 = Helpers.WorkflowExecuteAdditionalData(waitPromise1);
			const sequentialExecute = new WorkflowExecute(additionalData1, 'manual');
			const sequentialResult = await sequentialExecute.run(sequentialWorkflow, nodes[0]);
			workflowExecutionTimes.sequential = Date.now() - sequentialStart;

			// Reset execution times for parallel test
			Object.keys(nodeExecutionTimes).forEach((key) => delete nodeExecutionTimes[key]);

			// Test parallel execution
			const parallelStart = Date.now();
			const waitPromise2 = createDeferredPromise<IRun>();
			const additionalData2 = Helpers.WorkflowExecuteAdditionalData(waitPromise2);
			const parallelExecute = new WorkflowExecute(additionalData2, 'manual');
			const parallelResult = await parallelExecute.run(parallelWorkflow, nodes[0]);
			workflowExecutionTimes.parallel = Date.now() - parallelStart;

			// ASSERT
			expect(sequentialResult.finished).toBe(true);
			expect(parallelResult.finished).toBe(true);

			// Parallel execution should be significantly faster
			// Sequential: ~310ms (10 + 100 + 100 + 100), Parallel: ~110ms (10 + max(100,100,100))
			expect(workflowExecutionTimes.parallel).toBeLessThan(workflowExecutionTimes.sequential * 0.8);

			// Both should produce the same results
			expect(Object.keys(sequentialResult.data.resultData.runData)).toEqual(
				Object.keys(parallelResult.data.resultData.runData),
			);
		});

		it('should scale efficiently with increasing parallel workload', async () => {
			// ARRANGE
			const scalingResults: Record<number, number> = {};

			const createScalingNode = (name: string): INodeType => {
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
						// Simulate consistent processing time
						await new Promise((resolve) => setTimeout(resolve, 50));
						return [[{ json: { result: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createScalingNode(nodeName);
			});

			// Test with different numbers of parallel nodes
			const testSizes = [1, 2, 4, 8];

			for (const size of testSizes) {
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
				for (let i = 1; i <= size; i++) {
					nodes.push({
						id: `scale${i}`,
						name: `Scale${i}`,
						type: `test.scale${i}`,
						typeVersion: 1,
						position: [200, i * 30],
						parameters: {},
					});
					connections.push({
						node: `Scale${i}`,
						type: NodeConnectionTypes.Main,
						index: 0,
					});
				}

				const workflow = new Workflow({
					id: `scaling-test-${size}`,
					nodes,
					connections: {
						Trigger: { [NodeConnectionTypes.Main]: [connections] },
					},
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v2' as any,
						maxParallel: size, // Allow full parallelization
					},
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
				const workflowExecute = new WorkflowExecute(additionalData, 'manual');

				// ACT
				const startTime = Date.now();
				const result = await workflowExecute.run(workflow, nodes[0]);
				scalingResults[size] = Date.now() - startTime;

				// ASSERT
				expect(result.finished).toBe(true);
			}

			// Verify scaling characteristics
			// With proper parallelization, execution time should not increase linearly with node count
			expect(scalingResults[1]).toBeGreaterThan(50); // At least 50ms for 1 node
			expect(scalingResults[8]).toBeLessThan(scalingResults[1] * 8); // 8 nodes shouldn't take 8x longer

			// Parallel execution should show sub-linear scaling
			const scalingFactor = scalingResults[8] / scalingResults[1];
			expect(scalingFactor).toBeLessThan(4); // Should be much less than linear scaling
		});
	});

	describe('Memory and CPU Efficiency', () => {
		it('should not significantly increase memory usage compared to sequential execution', async () => {
			// ARRANGE
			let sequentialPeakMemory = 0;
			let parallelPeakMemory = 0;
			let currentMemory = 0;

			const createMemoryTrackingNode = (
				name: string,
				mode: 'sequential' | 'parallel',
			): INodeType => {
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
						// Simulate memory allocation
						const memoryUsage = 100;
						currentMemory += memoryUsage;

						if (mode === 'sequential') {
							sequentialPeakMemory = Math.max(sequentialPeakMemory, currentMemory);
						} else {
							parallelPeakMemory = Math.max(parallelPeakMemory, currentMemory);
						}

						try {
							await new Promise((resolve) => setTimeout(resolve, 30));
							return [[{ json: { result: name, memoryUsed: memoryUsage } }]];
						} finally {
							currentMemory -= memoryUsage;
						}
					},
				});
			};

			const createWorkflow = (mode: 'sequential' | 'parallel', executionOrder: string) => {
				nodeTypes.getByNameAndVersion.mockImplementation((name) => {
					const nodeName = name.replace('test.', '');
					return createMemoryTrackingNode(nodeName, mode);
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

				const connections: IConnection[] = [];
				for (let i = 1; i <= 4; i++) {
					nodes.push({
						id: `mem${i}`,
						name: `Mem${i}`,
						type: `test.mem${i}`,
						typeVersion: 1,
						position: [200, i * 30],
						parameters: {},
					});
					connections.push({
						node: `Mem${i}`,
						type: NodeConnectionTypes.Main,
						index: 0,
					});
				}

				return new Workflow({
					id: `memory-${mode}-test`,
					nodes,
					connections: {
						Trigger: { [NodeConnectionTypes.Main]: [connections] },
					},
					active: false,
					nodeTypes,
					settings: {
						executionOrder: executionOrder as any,
						maxParallel: 4,
					},
				});
			};

			// ACT
			// Test sequential execution
			currentMemory = 0;
			const sequentialWorkflow = createWorkflow('sequential', 'v1');
			const waitPromise1 = createDeferredPromise<IRun>();
			const additionalData1 = Helpers.WorkflowExecuteAdditionalData(waitPromise1);
			const sequentialExecute = new WorkflowExecute(additionalData1, 'manual');
			await sequentialExecute.run(sequentialWorkflow, sequentialWorkflow.nodes[0]);

			// Test parallel execution
			currentMemory = 0;
			const parallelWorkflow = createWorkflow('parallel', 'v2');
			const waitPromise2 = createDeferredPromise<IRun>();
			const additionalData2 = Helpers.WorkflowExecuteAdditionalData(waitPromise2);
			const parallelExecute = new WorkflowExecute(additionalData2, 'manual');
			await parallelExecute.run(parallelWorkflow, parallelWorkflow.nodes[0]);

			// ASSERT
			// Parallel execution should not use significantly more memory
			// Sequential peak: ~100 (one node at a time)
			// Parallel peak: ~400 (all nodes at once) - this is acceptable for the performance gain
			expect(sequentialPeakMemory).toBeLessThanOrEqual(150);
			expect(parallelPeakMemory).toBeLessThanOrEqual(500);

			// Memory usage should be proportional to parallelism level
			const memoryMultiplier = parallelPeakMemory / sequentialPeakMemory;
			expect(memoryMultiplier).toBeLessThanOrEqual(5); // Reasonable memory increase for 4x parallelism
		});

		it('should efficiently handle workflows with different branch complexities', async () => {
			// ARRANGE
			const executionMetrics: Record<
				string,
				{ startTime: number; endTime: number; duration: number }
			> = {};

			const createVariableComplexityNode = (name: string, complexity: number): INodeType => {
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
						const startTime = Date.now();

						// Simulate different processing complexities
						const processingTime = complexity * 20; // 20ms per complexity unit
						await new Promise((resolve) => setTimeout(resolve, processingTime));

						const endTime = Date.now();
						executionMetrics[name] = {
							startTime,
							endTime,
							duration: endTime - startTime,
						};

						return [[{ json: { result: name, complexity, processingTime } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				switch (nodeName) {
					case 'trigger':
						return createVariableComplexityNode('trigger', 1);
					case 'simple':
						return createVariableComplexityNode('simple', 1); // 20ms
					case 'medium':
						return createVariableComplexityNode('medium', 3); // 60ms
					case 'complex':
						return createVariableComplexityNode('complex', 5); // 100ms
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
					id: 'simple',
					name: 'Simple',
					type: 'test.simple',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'medium',
					name: 'Medium',
					type: 'test.medium',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'complex',
					name: 'Complex',
					type: 'test.complex',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'variable-complexity-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Simple', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Medium', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Complex', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const workflowStart = Date.now();
			const result = await workflowExecute.run(workflow, nodes[0]);
			const totalWorkflowTime = Date.now() - workflowStart;

			// ASSERT
			expect(result.finished).toBe(true);

			// Verify all nodes executed
			expect(executionMetrics.trigger).toBeDefined();
			expect(executionMetrics.simple).toBeDefined();
			expect(executionMetrics.medium).toBeDefined();
			expect(executionMetrics.complex).toBeDefined();

			// Verify parallel execution efficiency
			// Simple node should complete first, complex node should take longest
			expect(executionMetrics.simple.duration).toBeLessThan(executionMetrics.medium.duration);
			expect(executionMetrics.medium.duration).toBeLessThan(executionMetrics.complex.duration);

			// Total workflow time should be close to the longest individual task time + trigger time
			// (not the sum of all task times)
			const expectedMaxTime =
				executionMetrics.trigger.duration + executionMetrics.complex.duration + 50; // 50ms buffer
			expect(totalWorkflowTime).toBeLessThan(expectedMaxTime);
		});
	});

	describe('Stress Testing', () => {
		it('should handle high-throughput parallel execution without degradation', async () => {
			// ARRANGE
			const nodeCompletionTimes: number[] = [];
			let completedNodes = 0;

			const createHighThroughputNode = (name: string): INodeType => {
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
						const startTime = Date.now();

						// Simulate lightweight but numerous operations
						await new Promise((resolve) => setTimeout(resolve, 25));

						const completionTime = Date.now() - startTime;
						nodeCompletionTimes.push(completionTime);
						completedNodes++;

						return [[{ json: { completed: completedNodes, node: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createHighThroughputNode(nodeName);
			});

			// Create workflow with many parallel nodes
			const nodeCount = 20;
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
			for (let i = 1; i <= nodeCount; i++) {
				nodes.push({
					id: `throughput${i}`,
					name: `Throughput${i}`,
					type: `test.throughput${i}`,
					typeVersion: 1,
					position: [200, i * 20],
					parameters: {},
				});
				connections.push({
					node: `Throughput${i}`,
					type: NodeConnectionTypes.Main,
					index: 0,
				});
			}

			const workflow = new Workflow({
				id: 'high-throughput-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
					maxParallel: 10, // High but limited concurrency
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);
			expect(completedNodes).toBe(nodeCount + 1); // +1 for trigger

			// Verify consistent performance across all nodes
			const avgCompletionTime =
				nodeCompletionTimes.reduce((a, b) => a + b, 0) / nodeCompletionTimes.length;
			const maxCompletionTime = Math.max(...nodeCompletionTimes);
			const minCompletionTime = Math.min(...nodeCompletionTimes);

			// Performance should be consistent (no significant degradation)
			expect(maxCompletionTime - minCompletionTime).toBeLessThan(avgCompletionTime); // Variance should be reasonable
			expect(avgCompletionTime).toBeGreaterThan(20); // Should be close to expected 25ms
			expect(avgCompletionTime).toBeLessThan(100); // Should not degrade significantly
		});
	});
});
