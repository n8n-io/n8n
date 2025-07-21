import { createTestNode, createTestTaskData, createTestWorkflowObject } from '@/__tests__/mocks';
import { createAiData, getTreeNodeData } from '@/components/RunDataAi/utils';
import { type ITaskData, NodeConnectionTypes } from 'n8n-workflow';

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
					source: [{ previousNode: 'A', previousNodeRun: 0 }],
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
					source: [{ previousNode: 'A', previousNodeRun: 0 }],
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
					source: [{ previousNode: 'B', previousNodeRun: 0 }],
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					source: [{ previousNode: 'B', previousNodeRun: 1 }],
				}),
			],
		};

		expect(
			getTreeNodeData(
				'A',
				workflow,
				createAiData('A', workflow, (name) => taskDataByNodeName[name] ?? null),
				0,
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

	it("should filter runs by root node's run index", () => {
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
			A: [
				createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') }),
				createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') }),
			],
			B: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					source: [{ previousNode: 'A', previousNodeRun: 0 }],
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					source: [{ previousNode: 'A', previousNodeRun: 1 }],
				}),
			],
			C: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					source: [{ previousNode: 'B', previousNodeRun: 0 }],
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					source: [{ previousNode: 'B', previousNodeRun: 1 }],
				}),
			],
		};
		const aiData = createAiData('A', workflow, (name) => taskDataByNodeName[name] ?? null);

		const treeRun0 = getTreeNodeData('A', workflow, aiData, 0);
		const treeRun1 = getTreeNodeData('A', workflow, aiData, 1);

		expect(treeRun0).toHaveLength(1);
		expect(treeRun0[0].node).toBe('A');
		expect(treeRun0[0].children).toHaveLength(1);
		expect(treeRun0[0].children[0].node).toBe('B');
		expect(treeRun0[0].children[0].runIndex).toBe(0);
		expect(treeRun0[0].children[0].children).toHaveLength(1);
		expect(treeRun0[0].children[0].children[0].node).toBe('C');
		expect(treeRun0[0].children[0].children[0].runIndex).toBe(0);

		expect(treeRun1).toHaveLength(1);
		expect(treeRun1[0].node).toBe('A');
		expect(treeRun1[0].children).toHaveLength(1);
		expect(treeRun1[0].children[0].node).toBe('B');
		expect(treeRun1[0].children[0].runIndex).toBe(1);
		expect(treeRun1[0].children[0].children).toHaveLength(1);
		expect(treeRun1[0].children[0].children[0].node).toBe('C');
		expect(treeRun1[0].children[0].children[0].runIndex).toBe(1);
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
		const rootNode1Tree = getTreeNodeData('RootNode1', workflowWithSharedSubNode, aiData, 0);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for RootNode2 - should only show SharedSubNode with source RootNode2
		const rootNode2Tree = getTreeNodeData('RootNode2', workflowWithSharedSubNode, aiData, 0);
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
		const rootNodeTree = getTreeNodeData('RootNode', workflow, aiData, 0);
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
		const rootNodeTree = getTreeNodeData('RootNode', workflow, aiData, 0);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should include nodes with source array without previous node', () => {
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
				source: [null], // Array with null
				metadata: {
					executionTime: 100,
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					subExecution: undefined,
				},
			},
		};

		// Create test AI data array
		const aiData = [subNodeData];

		const rootNodeTree = getTreeNodeData('RootNode', workflow, aiData, 0);

		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node).toBe('SubNode');
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
		const rootNode1Tree = getTreeNodeData('RootNode1', workflow, aiData, 0);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node).toBe('DeepSubNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0);

		// Test filtering for RootNode2
		const rootNode2Tree = getTreeNodeData('RootNode2', workflow, aiData, 0);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node).toBe('DeepSubNode');
		expect(rootNode2Tree[0].children[0].children[0].runIndex).toBe(1);
	});
});
