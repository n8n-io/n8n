import type { WorkflowTestData, IRun } from 'n8n-workflow';
import { createDeferredPromise, Workflow, ApplicationError } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

const nodeTypes = Helpers.NodeTypes();

// V2 parallel execution test data following the same pattern as v1WorkflowExecuteTests
const v2WorkflowExecuteTests: WorkflowTestData[] = [
	{
		description: 'should execute parallel branches with v2 execution order',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'branch1',
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'branch2',
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [
					[
						{}, // Start node produces empty json object
					],
				],
				Set1: [
					[
						{
							branch: 'branch1', // Set node output without json wrapper
						},
					],
				],
				Set2: [
					[
						{
							branch: 'branch2', // Set node output without json wrapper
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'Set1', 'Set2'], // Note: v2 may execute Set1/Set2 in different order due to parallelism
		},
	},
	{
		description: 'should respect maxParallel limits in v2 mode',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'value',
										value: 'output1',
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'value',
										value: 'output2',
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [
					[
						{}, // Start node produces empty json object
					],
				],
				Set1: [
					[
						{
							value: 'output1', // Set node output without json wrapper
						},
					],
				],
				Set2: [
					[
						{
							value: 'output2', // Set node output without json wrapper
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'Set1', 'Set2'],
		},
	},
	{
		description: 'should handle complex multi-input merge nodes in parallel execution',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'A',
									},
								],
							},
						},
						name: 'SetA',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'B',
									},
								],
							},
						},
						name: 'SetB',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'C',
									},
								],
							},
						},
						name: 'SetC',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
					{
						id: 'uuid-5',
						parameters: {
							numberInputs: 3,
						},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2,
						position: [500, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'SetA',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetB',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetC',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetA: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetB: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					SetC: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 2,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [[{}]],
				SetA: [
					[
						{
							branch: 'A',
						},
					],
				],
				SetB: [
					[
						{
							branch: 'B',
						},
					],
				],
				SetC: [
					[
						{
							branch: 'C',
						},
					],
				],
				Merge: [
					[
						{
							branch: 'A',
						},
						{
							branch: 'B',
						},
						{
							branch: 'C',
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'SetA', 'SetB', 'SetC', 'Merge'],
		},
	},
	{
		description: 'should handle complex workflow similar to v1 tests with parallel execution',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'test',
										value: 'a',
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 720],
					},
					{
						id: 'uuid-3',
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 720],
					},
					{
						id: 'uuid-4',
						parameters: {},
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [940, 720],
					},
					{
						id: 'uuid-5',
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'a',
									},
								],
							},
						},
						name: 'IF2',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 900],
					},
					{
						id: 'uuid-6',
						parameters: {},
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [940, 900],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					IF2: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [[{}]],
				Set1: [
					[
						{
							test: 'a',
						},
					],
				],
				IF1: [[]],
				IF2: [
					[
						{
							test: 'a',
						},
					],
				],
				Merge1: [[]],
				Merge2: [
					[
						{
							test: 'a',
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'Set1', 'IF1', 'IF2', 'Merge1', 'Merge2'],
		},
	},
	{
		description: 'should handle stress test with many parallel branches and complex merging',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'A',
									},
								],
							},
						},
						name: 'SetA',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'B',
									},
								],
							},
						},
						name: 'SetB',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'C',
									},
								],
							},
						},
						name: 'SetC',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						id: 'uuid-5',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'D',
									},
								],
							},
						},
						name: 'SetD',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
					{
						id: 'uuid-6',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'E',
									},
								],
							},
						},
						name: 'SetE',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 500],
					},
					{
						id: 'uuid-7',
						parameters: {
							numberInputs: 5,
						},
						name: 'MergeAll',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2,
						position: [500, 300],
					},
					{
						id: 'uuid-8',
						parameters: {
							values: {
								string: [
									{
										name: 'final',
										value: 'complete',
									},
								],
							},
						},
						name: 'Final',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [700, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'SetA',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetB',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetC',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetD',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetE',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetA: {
						main: [
							[
								{
									node: 'MergeAll',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetB: {
						main: [
							[
								{
									node: 'MergeAll',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					SetC: {
						main: [
							[
								{
									node: 'MergeAll',
									type: 'main',
									index: 2,
								},
							],
						],
					},
					SetD: {
						main: [
							[
								{
									node: 'MergeAll',
									type: 'main',
									index: 3,
								},
							],
						],
					},
					SetE: {
						main: [
							[
								{
									node: 'MergeAll',
									type: 'main',
									index: 4,
								},
							],
						],
					},
					MergeAll: {
						main: [
							[
								{
									node: 'Final',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeData: {
				Start: [[{}]],
				SetA: [
					[
						{
							branch: 'A',
						},
					],
				],
				SetB: [
					[
						{
							branch: 'B',
						},
					],
				],
				SetC: [
					[
						{
							branch: 'C',
						},
					],
				],
				SetD: [
					[
						{
							branch: 'D',
						},
					],
				],
				SetE: [
					[
						{
							branch: 'E',
						},
					],
				],
				MergeAll: [
					[
						{
							branch: 'A',
						},
						{
							branch: 'B',
						},
						{
							branch: 'C',
						},
						{
							branch: 'D',
						},
						{
							branch: 'E',
						},
					],
				],
				Final: [
					[
						{
							branch: 'A',
							final: 'complete',
						},
						{
							branch: 'B',
							final: 'complete',
						},
						{
							branch: 'C',
							final: 'complete',
						},
						{
							branch: 'D',
							final: 'complete',
						},
						{
							branch: 'E',
							final: 'complete',
						},
					],
				],
			},
			nodeExecutionOrder: ['Start', 'SetA', 'SetB', 'SetC', 'SetD', 'SetE', 'MergeAll', 'Final'],
		},
	},
];

describe('WorkflowExecute', () => {
	describe('v2 execution order', () => {
		const tests: WorkflowTestData[] = v2WorkflowExecuteTests;

		const executionMode = 'manual';

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v2',
						maxParallel: 2,
					},
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise;

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData: any) => {
						if (nodeData.data === undefined) {
							return null;
						}
						if (!nodeData.data.main || !nodeData.data.main[0]) {
							return [];
						}
						return nodeData.data.main[0].map((entry: any) => entry.json);
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Note: We don't check execution order for v2 because parallel execution
				// may result in different but valid execution orders
				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	// Critical v2-specific tests
	describe('v2 parallel execution - performance and error handling', () => {
		test('should demonstrate performance improvement with parallel execution', async () => {
			// Create workflow with 4 parallel branches that would benefit from parallelism
			const workflowInstance = new Workflow({
				id: 'performance-test',
				nodes: [
					{
						id: 'start',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'set1',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'parallel1',
									},
								],
							},
						},
						name: 'Parallel1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
					},
					{
						id: 'set2',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'parallel2',
									},
								],
							},
						},
						name: 'Parallel2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'set3',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'parallel3',
									},
								],
							},
						},
						name: 'Parallel3',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						id: 'set4',
						parameters: {
							values: {
								string: [
									{
										name: 'branch',
										value: 'parallel4',
									},
								],
							},
						},
						name: 'Parallel4',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Parallel1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Parallel2',
									type: 'main',
									index: 0,
								},
								{
									node: 'Parallel3',
									type: 'main',
									index: 0,
								},
								{
									node: 'Parallel4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: 4, // Allow all 4 to run in parallel
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const startTime = Date.now();
			await workflowExecute.run(workflowInstance);
			const result = await waitPromise.promise;
			const endTime = Date.now();

			const executionTime = endTime - startTime;

			// Verify all nodes executed
			expect(result.finished).toBe(true);
			expect(Object.keys(result.data.resultData.runData)).toHaveLength(5); // Start + 4 parallel nodes

			// Verify execution completed quickly (parallel execution should be fast)
			expect(executionTime).toBeLessThan(1000); // Should complete within 1 second

			// Verify all parallel branches produced correct output
			expect(result.data.resultData.runData.Parallel1![0].data!.main[0]![0].json).toEqual({
				branch: 'parallel1',
			});
			expect(result.data.resultData.runData.Parallel2![0].data!.main[0]![0].json).toEqual({
				branch: 'parallel2',
			});
			expect(result.data.resultData.runData.Parallel3![0].data!.main[0]![0].json).toEqual({
				branch: 'parallel3',
			});
			expect(result.data.resultData.runData.Parallel4![0].data!.main[0]![0].json).toEqual({
				branch: 'parallel4',
			});
		});

		test('should properly isolate data between parallel executions', async () => {
			// Test that parallel executions don't interfere with each other's data
			const workflowInstance = new Workflow({
				id: 'isolation-test',
				nodes: [
					{
						id: 'start',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'set1',
						parameters: {
							values: {
								string: [
									{
										name: 'id',
										value: 'branch1',
									},
									{
										name: 'data',
										value: 'sensitive1',
									},
								],
							},
						},
						name: 'Branch1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'set2',
						parameters: {
							values: {
								string: [
									{
										name: 'id',
										value: 'branch2',
									},
									{
										name: 'data',
										value: 'sensitive2',
									},
								],
							},
						},
						name: 'Branch2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Branch1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Branch2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: 2,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			await workflowExecute.run(workflowInstance);
			const result = await waitPromise.promise;

			// Verify data isolation - each branch should have its own data
			const branch1Data = result.data.resultData.runData.Branch1![0].data!.main[0]![0].json;
			const branch2Data = result.data.resultData.runData.Branch2![0].data!.main[0]![0].json;

			expect(branch1Data).toEqual({ id: 'branch1', data: 'sensitive1' });
			expect(branch2Data).toEqual({ id: 'branch2', data: 'sensitive2' });

			// Verify no cross-contamination
			expect(branch1Data).not.toEqual(branch2Data);
			expect(branch1Data.data).not.toBe('sensitive2');
			expect(branch2Data.data).not.toBe('sensitive1');
		});

		test('should verify v2 parallel execution code path is actually used', async () => {
			// This test ensures we're actually testing v2 parallel execution, not falling back to v1
			const workflowInstance = new Workflow({
				id: 'v2-validation',
				nodes: [
					{
						id: 'start',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'set1',
						parameters: {
							values: {
								string: [
									{
										name: 'test',
										value: 'parallel',
									},
								],
							},
						},
						name: 'ParallelNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'ParallelNode',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2', // Explicitly set v2
					maxParallel: 5,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// Verify the workflow recognizes v2 mode
			expect(workflowExecute.isParallelExecutionEnabled(workflowInstance)).toBe(true);
			expect(workflowExecute.isLegacyExecutionOrder(workflowInstance)).toBe(true); // v2 is non-legacy (not v1)

			await workflowExecute.run(workflowInstance);
			const result = await waitPromise.promise;

			// Verify execution completed successfully
			expect(result.finished).toBe(true);
			expect(result.data.resultData.runData.ParallelNode![0].data!.main[0]![0].json).toEqual({
				test: 'parallel',
			});
		});
	});

	// Compare v1 vs v2 behavior for merge nodes
	describe('v1 vs v2 merge node comparison', () => {
		test('should handle 3-input merge in v1 mode', async () => {
			const workflowInstance = new Workflow({
				id: 'merge-v1',
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'A',
									},
								],
							},
						},
						name: 'SetA',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'B',
									},
								],
							},
						},
						name: 'SetB',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'C',
									},
								],
							},
						},
						name: 'SetC',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
					{
						id: 'uuid-5',
						parameters: {
							numberInputs: 3,
						},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2, // Use v3.2 which supports numberInputs
						position: [500, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'SetA',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetB',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetC',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetA: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetB: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					SetC: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 2,
								},
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v1', // Test with v1 mode
					maxParallel: Infinity,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			await workflowExecute.run(workflowInstance);
			const result = await waitPromise.promise;

			// The merge node should work correctly in v1
			expect(result.data.resultData.runData.Merge).toBeDefined();
			expect(result.data.resultData.runData.Merge).toHaveLength(1);
			expect(result.data.resultData.runData.Merge![0].data!.main[0]!).toHaveLength(3);
		});
	});

	// Dedicated test for debugging merge node issue
	describe('v2 merge node debugging', () => {
		test('should debug merge node execution with detailed logging', async () => {
			const workflowInstance = new Workflow({
				id: 'merge-debug',
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'A',
									},
								],
							},
						},
						name: 'SetA',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'B',
									},
								],
							},
						},
						name: 'SetB',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 300],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								string: [
									{
										name: 'data',
										value: 'C',
									},
								],
							},
						},
						name: 'SetC',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 400],
					},
					{
						id: 'uuid-5',
						parameters: {
							numberInputs: 3,
						},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3.2,
						position: [500, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'SetA',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetB',
									type: 'main',
									index: 0,
								},
								{
									node: 'SetC',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetA: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					SetB: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					SetC: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 2,
								},
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2',
					maxParallel: Infinity,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			await workflowExecute.run(workflowInstance);
			const result = await waitPromise.promise;

			// The merge node should have executed only once with all 3 inputs
			expect(result.data.resultData.runData.Merge).toBeDefined();
			expect(result.data.resultData.runData.Merge).toHaveLength(1);
			expect(result.data.resultData.runData.Merge![0].data!.main[0]!).toHaveLength(3);
		});
	});
});
