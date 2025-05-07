import {
	createTestLogEntry,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import {
	createAiData,
	createLogEntries,
	deepToRaw,
	findSelectedLogEntry,
	getTreeNodeData,
	getTreeNodeDataV2,
} from '@/components/RunDataAi/utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type ExecutionError,
	type ITaskData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { type LogEntrySelection } from '../CanvasChat/types/logs';
import { type IExecutionResponse } from '@/Interface';
import { isReactive, reactive } from 'vue';

describe(getTreeNodeData, () => {
	it('should generate one node per execution', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { ai_tool: [[{ node: 'A', type: NodeConnectionTypes.AiTool, index: 0 }]] },
				C: {
					ai_languageModel: [[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]],
				},
			},
		});
		const taskDataByNodeName: Record<string, ITaskData[]> = {
			A: [createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') })],
			B: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsage: {
											completionTokens: 1,
											promptTokens: 2,
											totalTokens: 3,
										},
									},
								},
							],
						],
					},
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsage: {
											completionTokens: 4,
											promptTokens: 5,
											totalTokens: 6,
										},
									},
								},
							],
						],
					},
				}),
			],
			C: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsageEstimate: {
											completionTokens: 7,
											promptTokens: 8,
											totalTokens: 9,
										},
									},
								},
							],
						],
					},
				}),
				createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:04.000Z') }),
			],
		};

		expect(
			getTreeNodeData(
				'A',
				workflow,
				createAiData('A', workflow, (name) => taskDataByNodeName[name] ?? null),
			),
		).toEqual([
			{
				depth: 0,
				id: 'A:0',
				node: 'A',
				runIndex: 0,
				startTime: 0,
				parent: undefined,
				consumedTokens: {
					completionTokens: 0,
					promptTokens: 0,
					totalTokens: 0,
					isEstimate: false,
				},
				children: [
					{
						depth: 1,
						id: 'B:0',
						node: 'B',
						runIndex: 0,
						startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						parent: expect.objectContaining({ node: 'A' }),
						consumedTokens: {
							completionTokens: 1,
							promptTokens: 2,
							totalTokens: 3,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:0',
								node: 'C',
								runIndex: 0,
								startTime: Date.parse('2025-02-26T00:00:02.000Z'),
								parent: expect.objectContaining({ node: 'B' }),
								consumedTokens: {
									completionTokens: 7,
									promptTokens: 8,
									totalTokens: 9,
									isEstimate: true,
								},
							},
						],
					},
					{
						depth: 1,
						id: 'B:1',
						node: 'B',
						runIndex: 1,
						startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						parent: expect.objectContaining({ node: 'A' }),
						consumedTokens: {
							completionTokens: 4,
							promptTokens: 5,
							totalTokens: 6,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:1',
								node: 'C',
								runIndex: 1,
								startTime: Date.parse('2025-02-26T00:00:04.000Z'),
								parent: expect.objectContaining({ node: 'B' }),
								consumedTokens: {
									completionTokens: 0,
									promptTokens: 0,
									totalTokens: 0,
									isEstimate: false,
								},
							},
						],
					},
				],
			},
		]);
	});

	it('should filter node executions based on source node', () => {
		const workflowWithSharedSubNode = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'RootNode1' }),
				createTestNode({ name: 'RootNode2' }),
				createTestNode({ name: 'SharedSubNode' }),
			],
			connections: {
				SharedSubNode: {
					ai_tool: [
						[{ node: 'RootNode1', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'RootNode2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			},
		});

		// Create test AI data with source information
		const sharedSubNodeData1 = {
			node: 'SharedSubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from RootNode1' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode1', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		const sharedSubNodeData2 = {
			node: 'SharedSubNode',
			runIndex: 1,
			data: {
				data: [{ json: { result: 'from RootNode2' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode2', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [sharedSubNodeData1, sharedSubNodeData2];

		// Test for RootNode1 - should only show SharedSubNode with source RootNode1
		const rootNode1Tree = getTreeNodeData('RootNode1', workflowWithSharedSubNode, aiData);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for RootNode2 - should only show SharedSubNode with source RootNode2
		const rootNode2Tree = getTreeNodeData('RootNode2', workflowWithSharedSubNode, aiData);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should filter node executions based on source run index', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test AI data with source information
		const subNodeData1 = {
			node: 'SubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from RootNode' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		const subNodeData2 = {
			node: 'SubNode',
			runIndex: 1,
			data: {
				data: [{ json: { result: 'from RootNode' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode', previousNodeRun: 1 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [subNodeData1, subNodeData2];

		// Test for run #1 of RootNode - should only show SubNode with source run index 0
		const rootNode1Tree = getTreeNodeData('RootNode', workflow, aiData, 0);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node).toBe('SubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for run #2 of RootNode - should only show SubNode with source run index 1
		const rootNode2Tree = getTreeNodeData('RootNode', workflow, aiData, 1);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node).toBe('SubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should include nodes without source information', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test AI data with a node that has no source information
		const subNodeData = {
			node: 'SubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from RootNode' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				// No source field intentionally
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [subNodeData];

		// Test for RootNode - should still show SubNode even without source info
		const rootNodeTree = getTreeNodeData('RootNode', workflow, aiData);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should include nodes with empty source array', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test AI data with a node that has empty source array
		const subNodeData = {
			node: 'SubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from RootNode' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [], // Empty array
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [subNodeData];

		// Test for RootNode - should still show SubNode even with empty source array
		const rootNodeTree = getTreeNodeData('RootNode', workflow, aiData);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should filter deeper nested nodes based on source', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'RootNode1' }),
				createTestNode({ name: 'RootNode2' }),
				createTestNode({ name: 'SharedSubNode' }),
				createTestNode({ name: 'DeepSubNode' }),
			],
			connections: {
				SharedSubNode: {
					ai_tool: [
						[{ node: 'RootNode1', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'RootNode2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				DeepSubNode: {
					ai_tool: [[{ node: 'SharedSubNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test AI data with source information
		const sharedSubNodeData1 = {
			node: 'SharedSubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from RootNode1' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode1', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		const sharedSubNodeData2 = {
			node: 'SharedSubNode',
			runIndex: 1,
			data: {
				data: [{ json: { result: 'from RootNode2' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'RootNode2', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					subExecution: undefined,
				},
			},
		};

		const deepSubNodeData1 = {
			node: 'DeepSubNode',
			runIndex: 0,
			data: {
				data: [{ json: { result: 'from SharedSubNode run 0' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'SharedSubNode', previousNodeRun: 0 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					subExecution: undefined,
				},
			},
		};

		const deepSubNodeData2 = {
			node: 'DeepSubNode',
			runIndex: 1,
			data: {
				data: [{ json: { result: 'from SharedSubNode run 1' } }],
				inOut: 'output' as const,
				type: NodeConnectionTypes.AiTool,
				source: [{ previousNode: 'SharedSubNode', previousNodeRun: 1 }],
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [sharedSubNodeData1, sharedSubNodeData2, deepSubNodeData1, deepSubNodeData2];

		// Test filtering for RootNode1
		const rootNode1Tree = getTreeNodeData('RootNode1', workflow, aiData);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node).toBe('DeepSubNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0);

		// Test filtering for RootNode2
		const rootNode2Tree = getTreeNodeData('RootNode2', workflow, aiData);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node).toBe('DeepSubNode');
		expect(rootNode2Tree[0].children[0].children[0].runIndex).toBe(1);
	});
});

describe(getTreeNodeDataV2, () => {
	it('should generate one node per execution', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { ai_tool: [[{ node: 'A', type: NodeConnectionTypes.AiTool, index: 0 }]] },
				C: {
					ai_languageModel: [[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]],
				},
			},
		});

		const jsonB1 = { tokenUsage: { completionTokens: 1, promptTokens: 2, totalTokens: 3 } };
		const jsonB2 = { tokenUsage: { completionTokens: 4, promptTokens: 5, totalTokens: 6 } };
		const jsonC1 = { tokenUsageEstimate: { completionTokens: 7, promptTokens: 8, totalTokens: 9 } };

		expect(
			getTreeNodeDataV2('A', createTestTaskData({}), workflow, {
				A: [createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') })],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						data: { main: [[{ json: jsonB1 }]] },
					}),
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						data: { main: [[{ json: jsonB2 }]] },
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:02.000Z'),
						data: { main: [[{ json: jsonC1 }]] },
					}),
					createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:04.000Z') }),
				],
			}),
		).toEqual([
			{
				depth: 0,
				id: 'A:0',
				node: expect.objectContaining({ name: 'A' }),
				runIndex: 0,
				runData: expect.objectContaining({ startTime: 0 }),
				parent: undefined,
				consumedTokens: {
					completionTokens: 0,
					promptTokens: 0,
					totalTokens: 0,
					isEstimate: false,
				},
				children: [
					{
						depth: 1,
						id: 'B:0',
						node: expect.objectContaining({ name: 'B' }),
						runIndex: 0,
						runData: expect.objectContaining({
							startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						}),
						parent: expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) }),
						consumedTokens: {
							completionTokens: 1,
							promptTokens: 2,
							totalTokens: 3,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:0',
								node: expect.objectContaining({ name: 'C' }),
								runIndex: 0,
								runData: expect.objectContaining({
									startTime: Date.parse('2025-02-26T00:00:02.000Z'),
								}),
								parent: expect.objectContaining({ node: expect.objectContaining({ name: 'B' }) }),
								consumedTokens: {
									completionTokens: 7,
									promptTokens: 8,
									totalTokens: 9,
									isEstimate: true,
								},
							},
						],
					},
					{
						depth: 1,
						id: 'B:1',
						node: expect.objectContaining({ name: 'B' }),
						runIndex: 1,
						runData: expect.objectContaining({
							startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						}),
						parent: expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) }),
						consumedTokens: {
							completionTokens: 4,
							promptTokens: 5,
							totalTokens: 6,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:1',
								node: expect.objectContaining({ name: 'C' }),
								runIndex: 1,
								runData: expect.objectContaining({
									startTime: Date.parse('2025-02-26T00:00:04.000Z'),
								}),
								parent: expect.objectContaining({ node: expect.objectContaining({ name: 'B' }) }),
								consumedTokens: {
									completionTokens: 0,
									promptTokens: 0,
									totalTokens: 0,
									isEstimate: false,
								},
							},
						],
					},
				],
			},
		]);
	});

	it('should filter node executions based on source node', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'RootNode1' }),
				createTestNode({ name: 'RootNode2' }),
				createTestNode({ name: 'SharedSubNode' }),
			],
			connections: {
				SharedSubNode: {
					ai_tool: [
						[{ node: 'RootNode1', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'RootNode2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			},
		});

		// Create test run data with source information
		const runData = {
			RootNode1: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
			],
			RootNode2: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
				}),
			],
			SharedSubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					executionIndex: 2,
					source: [{ previousNode: 'RootNode1', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from RootNode1' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
					source: [{ previousNode: 'RootNode2', previousNodeRun: 1 }],
					data: { main: [[{ json: { result: 'from RootNode2' } }]] },
				}),
			],
		};

		// Test for RootNode1 - should only show SharedSubNode with source RootNode1
		const rootNode1Tree = getTreeNodeDataV2('RootNode1', runData.RootNode1[0], workflow, runData);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for RootNode2 - should only show SharedSubNode with source RootNode2
		const rootNode2Tree = getTreeNodeDataV2('RootNode2', runData.RootNode2[0], workflow, runData);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should filter node executions based on source run index', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test run data with source information
		const runData = {
			RootNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					executionIndex: 2,
				}),
			],
			SubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
				}),
			],
		};

		// Test for run #1 of RootNode - should only show SubNode with source run index 0
		const rootNode1Tree = getTreeNodeDataV2('RootNode', runData.RootNode[0], workflow, runData, 0);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for run #2 of RootNode - should only show SubNode with source run index 1
		const rootNode2Tree = getTreeNodeDataV2('RootNode', runData.RootNode[1], workflow, runData, 1);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should include nodes without source information (v2)', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test run data with a node that has no source field
		const runData = {
			RootNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
			],
			SubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
					// No source field
					data: { main: [[{ json: { result: 'from RootNode' } }]] },
				}),
			],
		};

		// Test for RootNode - should still show SubNode even without source info
		const rootNodeTree = getTreeNodeDataV2('RootNode', runData.RootNode[0], workflow, runData);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should include nodes with empty source array (v2)', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'RootNode' }), createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test run data with a node that has empty source array
		const runData = {
			RootNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
			],
			SubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
					source: [], // Empty array
					data: { main: [[{ json: { result: 'from RootNode' } }]] },
				}),
			],
		};

		// Test for RootNode - should still show SubNode even with empty source array
		const rootNodeTree = getTreeNodeDataV2('RootNode', runData.RootNode[0], workflow, runData);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should filter deeper nested nodes based on source (v2)', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'RootNode1' }),
				createTestNode({ name: 'RootNode2' }),
				createTestNode({ name: 'SharedSubNode' }),
				createTestNode({ name: 'DeepSubNode' }),
			],
			connections: {
				SharedSubNode: {
					ai_tool: [
						[{ node: 'RootNode1', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'RootNode2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				DeepSubNode: {
					ai_tool: [[{ node: 'SharedSubNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test run data with source information
		const runData = {
			RootNode1: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
			],
			RootNode2: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
				}),
			],
			SharedSubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					executionIndex: 2,
					source: [{ previousNode: 'RootNode1' }],
					data: { main: [[{ json: { result: 'from RootNode1' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
					source: [{ previousNode: 'RootNode2' }],
					data: { main: [[{ json: { result: 'from RootNode2' } }]] },
				}),
			],
			DeepSubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					executionIndex: 4,
					source: [{ previousNode: 'SharedSubNode' }],
					data: { main: [[{ json: { result: 'from SharedSubNode run 0' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:05.000Z'),
					executionIndex: 5,
					source: [{ previousNode: 'SharedSubNode' }],
					data: { main: [[{ json: { result: 'from SharedSubNode run 1' } }]] },
				}),
			],
		};

		// Test filtering for RootNode1
		const rootNode1Tree = getTreeNodeDataV2('RootNode1', runData.RootNode1[0], workflow, runData);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node.name).toBe('DeepSubNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0);

		// Test filtering for RootNode2
		const rootNode2Tree = getTreeNodeDataV2('RootNode2', runData.RootNode2[0], workflow, runData);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node.name).toBe('DeepSubNode');
		expect(rootNode2Tree[0].children[0].children[0].runIndex).toBe(1);
	});

	it('should handle complex tree with multiple branches and filters correctly', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'RootNode1' }),
				createTestNode({ name: 'RootNode2' }),
				createTestNode({ name: 'SubNodeA' }),
				createTestNode({ name: 'SubNodeB' }),
				createTestNode({ name: 'DeepNode' }),
			],
			connections: {
				SubNodeA: {
					ai_tool: [[{ node: 'RootNode1', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
				SubNodeB: {
					ai_tool: [[{ node: 'RootNode2', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
				DeepNode: {
					ai_tool: [
						[{ node: 'SubNodeA', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'SubNodeB', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			},
		});

		// Create test run data with source information
		const runData = {
			RootNode1: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:00.000Z'),
					executionIndex: 0,
				}),
			],
			RootNode2: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					executionIndex: 1,
				}),
			],
			SubNodeA: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					executionIndex: 2,
					source: [{ previousNode: 'RootNode1' }],
					data: { main: [[{ json: { result: 'from RootNode1' } }]] },
				}),
			],
			SubNodeB: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
					source: [{ previousNode: 'RootNode2' }],
					data: { main: [[{ json: { result: 'from RootNode2' } }]] },
				}),
			],
			DeepNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					executionIndex: 4,
					source: [{ previousNode: 'SubNodeA' }],
					data: { main: [[{ json: { result: 'from SubNodeA' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:05.000Z'),
					executionIndex: 5,
					source: [{ previousNode: 'SubNodeB' }],
					data: { main: [[{ json: { result: 'from SubNodeB' } }]] },
				}),
			],
		};

		// Test filtering for RootNode1 -> SubNodeA -> DeepNode
		const rootNode1Tree = getTreeNodeDataV2('RootNode1', runData.RootNode1[0], workflow, runData);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNodeA');
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node.name).toBe('DeepNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0); // First DeepNode execution

		// Test filtering for RootNode2 -> SubNodeB -> DeepNode
		const rootNode2Tree = getTreeNodeDataV2('RootNode2', runData.RootNode2[0], workflow, runData);

		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SubNodeB');
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node.name).toBe('DeepNode');

		const deepNodeRunIndex = rootNode2Tree[0].children[0].children[0].runIndex;
		expect(typeof deepNodeRunIndex).toBe('number');
	});
});

describe(findSelectedLogEntry, () => {
	function find(state: LogEntrySelection, response: IExecutionResponse) {
		return findSelectedLogEntry(state, {
			...response,
			tree: createLogEntries(
				createTestWorkflowObject(response.workflowData),
				response.data?.resultData.runData ?? {},
			),
		});
	}

	describe('when log is not manually selected', () => {
		it('should return undefined if no execution data exists', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: { resultData: { runData: {} } },
			});

			expect(find({ type: 'initial' }, response)).toBe(undefined);
		});

		it('should return first log entry with error', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			);
		});

		it("should return first log entry with error even if it's on a sub node", () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
					connections: {
						C: {
							[NodeConnectionTypes.AiLanguageModel]: [
								[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
							],
						},
					},
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			);
		});

		it('should return first log entry for AI agent node if there is no log entry with error', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B', type: AGENT_LANGCHAIN_NODE_TYPE }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
			);
		});

		it('should return first log entry if there is no log entry with error nor executed AI agent node', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'success' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
		});
	});

	describe('when log is manually selected', () => {
		it('should return manually selected log', () => {
			const nodeA = createTestNode({ name: 'A' });
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					id: 'test-wf-id',
					nodes: [nodeA, createTestNode({ name: 'B' })],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' })],
						},
					},
				},
			});

			const result = find(
				{
					type: 'selected',
					workflowId: 'test-wf-id',
					data: createTestLogEntry({ node: nodeA, runIndex: 0 }),
				},
				response,
			);

			expect(result).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
		});
	});
});

describe(createLogEntries, () => {
	it('should return root node log entries in ascending order of executionIndex', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});

		expect(
			createLogEntries(workflow, {
				A: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:00.000Z'),
						executionIndex: 0,
					}),
				],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:01.000Z'),
						executionIndex: 1,
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:02.000Z'),
						executionIndex: 3,
					}),
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:03.000Z'),
						executionIndex: 2,
					}),
				],
			}),
		).toEqual([
			expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
		]);
	});

	it('should return sub node log entries in ascending order of executionIndex', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
		});

		expect(
			createLogEntries(workflow, {
				A: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:00.000Z'),
						executionIndex: 0,
					}),
				],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:01.000Z'),
						executionIndex: 1,
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:02.000Z'),
						executionIndex: 3,
					}),
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:03.000Z'),
						executionIndex: 2,
					}),
				],
			}),
		).toEqual([
			expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			expect.objectContaining({
				node: expect.objectContaining({ name: 'B' }),
				runIndex: 0,
				children: [
					expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
					expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
				],
			}),
		]);
	});

	it('should not include runs for disabled nodes', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B', disabled: true })],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});

		expect(
			createLogEntries(workflow, { A: [createTestTaskData()], B: [createTestTaskData()] }),
		).toEqual([expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) })]);
	});
});

describe(deepToRaw, () => {
	it('should convert reactive fields to raw in data with circular structure', () => {
		const data = reactive({
			foo: reactive({ bar: {} }),
			bazz: {},
		});

		data.foo.bar = data;
		data.bazz = data;

		const raw = deepToRaw(data);

		expect(isReactive(data)).toBe(true);
		expect(isReactive(data.foo)).toBe(true);
		expect(isReactive(data.foo.bar)).toBe(true);
		expect(isReactive(data.bazz)).toBe(true);
		expect(isReactive(raw)).toBe(false);
		expect(isReactive(raw.foo)).toBe(false);
		expect(isReactive(raw.foo.bar)).toBe(false);
		expect(isReactive(raw.bazz)).toBe(false);
	});
});
