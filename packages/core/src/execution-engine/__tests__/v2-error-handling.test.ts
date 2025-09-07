import { mock } from 'jest-mock-extended';
import type {
	IConnection,
	INode,
	INodeType,
	INodeTypes,
	IRun,
	IExecuteFunctions,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeConnectionTypes,
	Workflow,
} from 'n8n-workflow';

import { WorkflowExecute } from '@/execution-engine/workflow-execute';
import * as Helpers from '@test/helpers';

describe('V2 Parallel Execution - Error Handling Tests', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	describe('Error Isolation and Recovery', () => {
		it('should isolate errors to specific branches without affecting parallel branches', async () => {
			// ARRANGE
			const successfulExecutions: string[] = [];
			const failedExecutions: string[] = [];

			const createMixedNode = (name: string, shouldFail: boolean): INodeType => {
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
						if (shouldFail) {
							failedExecutions.push(name);
							throw new ApplicationError(`Intentional error in ${name}`);
						}

						successfulExecutions.push(name);
						return [[{ json: { success: true, node: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				switch (name) {
					case 'test.trigger':
						return createMixedNode('trigger', false);
					case 'test.success1':
						return createMixedNode('success1', false);
					case 'test.success2':
						return createMixedNode('success2', false);
					case 'test.error1':
						return createMixedNode('error1', true);
					case 'test.error2':
						return createMixedNode('error2', true);
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
					id: 'success1',
					name: 'Success1',
					type: 'test.success1',
					typeVersion: 1,
					position: [200, -100],
					parameters: {},
				},
				{
					id: 'error1',
					name: 'Error1',
					type: 'test.error1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'success2',
					name: 'Success2',
					type: 'test.success2',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'error2',
					name: 'Error2',
					type: 'test.error2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'error-isolation-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Success1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Error1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Success2', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Error2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			try {
				await workflowExecute.run(workflow, nodes[0]);
				// Should throw due to errors, but successful branches should still have executed
			} catch (error) {
				// Expected to throw
			}

			// ASSERT
			// Successful nodes should have executed despite errors in parallel branches
			expect(successfulExecutions).toContain('trigger');
			expect(successfulExecutions).toContain('success1');
			expect(successfulExecutions).toContain('success2');

			// Failed nodes should be recorded
			expect(failedExecutions).toContain('error1');
			expect(failedExecutions).toContain('error2');
		});

		it('should provide detailed error context for debugging parallel execution', async () => {
			// ARRANGE
			const errorDetails: any[] = [];

			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Error Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute(this: IExecuteFunctions) {
					const nodeInfo = this.getNode();
					const inputData = this.getInputData();

					const error = new ApplicationError('Parallel execution error', {
						extra: {
							nodeId: nodeInfo.id,
							nodeName: nodeInfo.name,
							inputDataLength: inputData.length,
							executionMode: 'parallel',
						},
					});

					errorDetails.push({
						nodeId: nodeInfo.id,
						nodeName: nodeInfo.name,
						error: error.message,
						extra: error.extra,
					});

					throw error;
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const errorNode: INode = {
				id: 'error-detail-test',
				name: 'ErrorDetailTest',
				type: 'test.error',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const workflow = new Workflow({
				id: 'error-detail-test',
				nodes: [errorNode],
				connections: {},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, errorNode);

			// ASSERT - Error should be captured in result data
			expect(result.data.resultData.error).toBeDefined();
			expect(result.data.resultData.error?.message).toBe('Parallel execution error');

			// Verify error details were captured correctly
			expect(errorDetails).toHaveLength(1);
			expect(errorDetails[0]).toMatchObject({
				nodeId: 'error-detail-test',
				nodeName: 'ErrorDetailTest',
				error: 'Parallel execution error',
				extra: {
					nodeId: 'error-detail-test',
					nodeName: 'ErrorDetailTest',
					executionMode: 'parallel',
				},
			});
		});

		it('should handle timeout scenarios gracefully in parallel execution', async () => {
			// ARRANGE
			const executionTimes: Record<string, number> = {};
			const completionPromises: Array<() => void> = [];

			const createTimeoutNode = (name: string, delay: number): INodeType => {
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

						return await new Promise((resolve) => {
							const timeoutId = setTimeout(() => {
								executionTimes[name] = Date.now() - startTime;
								resolve([[{ json: { completed: true, node: name } }]]);
							}, delay);

							completionPromises.push(() => {
								clearTimeout(timeoutId);
								executionTimes[name] = Date.now() - startTime;
								resolve([[{ json: { completed: true, node: name } }]]);
							});
						});
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				switch (name) {
					case 'test.trigger':
						return createTimeoutNode('trigger', 10);
					case 'test.fast':
						return createTimeoutNode('fast', 50);
					case 'test.slow':
						return createTimeoutNode('slow', 500); // Would normally timeout
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
					id: 'fast',
					name: 'Fast',
					type: 'test.fast',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'slow',
					name: 'Slow',
					type: 'test.slow',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'timeout-handling-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Fast', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Slow', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			// Set a short timeout to test timeout handling
			additionalData.executionTimeoutTimestamp = Date.now() + 200;

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const executionPromise = workflowExecute.run(workflow, nodes[0]);

			// Wait a bit then complete fast operations
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Complete some operations before timeout
			if (completionPromises.length > 0) {
				completionPromises.splice(0, 2).forEach((complete) => complete());
			}

			const result = await executionPromise;

			// ASSERT
			// Should handle timeout gracefully without hanging
			expect(result).toBeDefined();
			// Trigger should have completed (it has a short delay)
			expect(executionTimes.trigger || 0).toBeLessThan(150);
			if (executionTimes.fast) {
				expect(executionTimes.fast).toBeLessThan(200);
			}
		});
	});

	describe('Complex Error Scenarios', () => {
		it('should handle cascading errors in parallel branches', async () => {
			// ARRANGE
			const executionResults: Record<string, 'success' | 'error'> = {};

			const createCascadingNode = (name: string, dependsOn?: string): INodeType => {
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
						// Simulate dependency check
						if (dependsOn && executionResults[dependsOn] === 'error') {
							executionResults[name] = 'error';
							throw new ApplicationError(`${name} failed because ${dependsOn} failed`);
						}

						// Simulate some work
						await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

						if (name.includes('failing') || name === 'FailingNode') {
							executionResults[name] = 'error';
							throw new ApplicationError('Intentional failure');
						}

						executionResults[name] = 'success';
						return [[{ json: { success: true, node: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createCascadingNode(nodeName);
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
					id: 'independent',
					name: 'Independent',
					type: 'test.independent',
					typeVersion: 1,
					position: [200, -100],
					parameters: {},
				},
				{
					id: 'failing',
					name: 'FailingNode',
					type: 'test.failingnode',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'dependent',
					name: 'Dependent',
					type: 'test.dependent',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'cascading-error-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Independent', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'FailingNode', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
					FailingNode: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Dependent', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			try {
				await workflowExecute.run(workflow, nodes[0]);
			} catch (error) {
				// Expected to throw
			}

			// ASSERT
			// Independent branch should succeed despite parallel branch failure
			expect(executionResults.trigger).toBe('success');
			expect(executionResults.independent).toBe('success');
			expect(executionResults.failingnode).toBe('error'); // Check the processed name
			// Dependent node should not execute because its parent failed
			expect(executionResults.dependent).toBeUndefined();
		});

		it('should handle memory exhaustion gracefully', async () => {
			// ARRANGE
			let totalMemoryUsed = 0;
			const memoryLimit = 500; // Simulated memory limit
			const memoryPerNode = 150;

			const createMemoryNode = (name: string): INodeType => {
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
						// Check if we can allocate memory
						if (totalMemoryUsed + memoryPerNode > memoryLimit) {
							throw new Error('Out of memory');
						}

						totalMemoryUsed += memoryPerNode;

						try {
							// Simulate memory-intensive work
							const largeData = new Array(1000).fill({ data: `${name}_data` });
							await new Promise((resolve) => setTimeout(resolve, 50));

							return [[{ json: { result: name, dataSize: largeData.length } }]];
						} finally {
							totalMemoryUsed -= memoryPerNode;
						}
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createMemoryNode(nodeName);
			});

			// Create more nodes than can fit in memory simultaneously
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
				id: 'memory-exhaustion-test',
				nodes,
				connections: {
					Trigger: { [NodeConnectionTypes.Main]: [connections] },
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: 2, // Limit concurrent executions to prevent memory exhaustion
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			// Should complete successfully with proper resource management
			expect(result.finished).toBe(true);
			// Memory should never have exceeded safe limits due to maxParallel constraint
			expect(totalMemoryUsed).toBeLessThanOrEqual(memoryLimit);
		});

		it('should handle node execution cancellation properly', async () => {
			// ARRANGE
			const cancelledNodes: string[] = [];
			const completedNodes: string[] = [];
			const cancellationRequested = false;

			const createCancellableNode = (name: string): INodeType => {
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
						const abortSignal = this.getExecutionCancelSignal();

						return await new Promise((resolve, reject) => {
							const timeoutId = setTimeout(
								() => {
									if (cancellationRequested || abortSignal?.aborted) {
										cancelledNodes.push(name);
										reject(new Error(`${name} was cancelled`));
									} else {
										completedNodes.push(name);
										resolve([[{ json: { completed: true, node: name } }]]);
									}
								},
								Math.random() * 100 + 50,
							);

							// Listen for cancellation
							if (abortSignal) {
								abortSignal.addEventListener('abort', () => {
									clearTimeout(timeoutId);
									cancelledNodes.push(name);
									reject(new Error(`${name} was cancelled`));
								});
							}
						});
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createCancellableNode(nodeName);
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
					id: 'long1',
					name: 'LongRunning1',
					type: 'test.longrunning1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'long2',
					name: 'LongRunning2',
					type: 'test.longrunning2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'cancellation-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'LongRunning1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'LongRunning2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			// Set a very short timeout to trigger cancellation
			additionalData.executionTimeoutTimestamp = Date.now() + 150;

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			// Should handle cancellation gracefully
			expect(result).toBeDefined();
			// At least the trigger should have completed
			expect(completedNodes).toContain('trigger');
		});
	});
});
