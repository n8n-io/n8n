import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import {
	createLogTree,
	findSelectedLogEntry,
	findSubExecutionLocator,
	getDefaultCollapsedEntries,
	getTreeNodeData,
	mergeStartData,
	restoreChatHistory,
	processFiles,
	extractBotResponse,
	wrapLogEntriesInGroups,
	getGroupInputEntries,
	getGroupOutputEntries,
} from './logs.utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	createEmptyRunExecutionData,
	createRunExecutionData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type {
	ExecutionError,
	IConnections,
	ITaskStartedData,
	IRunExecutionData,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	aiAgentNode,
	aiChatWorkflow,
	aiModelNode,
	createTestLogTreeCreationContext,
} from './__test__/data';
import { isLogGroupEntry, type LogEntrySelection, type LogTreeEntry } from './logs.types';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { createTestLogEntry } from './__test__/mocks';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';

// Test helper: read a parent entry's node name (parents in these trees are nodes).
function parentNodeName(entry: LogTreeEntry): string | undefined {
	const parent = entry.parent;
	return parent && !isLogGroupEntry(parent) ? parent.node.name : undefined;
}

describe(getTreeNodeData, () => {
	it('should generate one node per execution', () => {
		const nodeA = createTestNode({ name: 'A', id: 'test-node-id-a' });
		const workflow = createTestWorkflowObject({
			id: 'test-wf-id',
			nodes: [
				nodeA,
				createTestNode({ name: 'B', id: 'test-node-id-b' }),
				createTestNode({ name: 'C', id: 'test-node-id-c' }),
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

		const ctx = createTestLogTreeCreationContext(workflow, {
			A: [createTestTaskData({ startTime: 1740528000000 })],
			B: [
				createTestTaskData({
					startTime: 1740528000001,
					data: { main: [[{ json: jsonB1 }]] },
				}),
				createTestTaskData({
					startTime: 1740528000002,
					data: { main: [[{ json: jsonB2 }]] },
				}),
			],
			C: [
				createTestTaskData({
					startTime: 1740528000003,
					data: { main: [[{ json: jsonC1 }]] },
				}),
				createTestTaskData({ startTime: 1740528000004 }),
			],
		});
		const logTree = getTreeNodeData(nodeA, ctx.data.resultData.runData.A[0], undefined, ctx);

		expect(logTree.length).toBe(1);

		expect(logTree[0].id).toBe('test-wf-id:test-node-id-a:0');
		expect(logTree[0].runIndex).toBe(0);
		expect(logTree[0].parent).toBe(undefined);
		expect(logTree[0].runData?.startTime).toBe(1740528000000);
		expect(logTree[0].children.length).toBe(2);

		expect(logTree[0].children[0].id).toBe('test-wf-id:test-node-id-b:0:0');
		expect(logTree[0].children[0].runIndex).toBe(0);
		expect(parentNodeName(logTree[0].children[0])).toBe('A');
		expect(logTree[0].children[0].runData?.startTime).toBe(1740528000001);
		expect(logTree[0].children[0].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[0].consumedTokens.completionTokens).toBe(1);
		expect(logTree[0].children[0].children.length).toBe(1);

		expect(logTree[0].children[0].children[0].id).toBe('test-wf-id:test-node-id-c:0:0:0');
		expect(logTree[0].children[0].children[0].runIndex).toBe(0);
		expect(parentNodeName(logTree[0].children[0].children[0])).toBe('B');
		expect(logTree[0].children[0].children[0].consumedTokens.isEstimate).toBe(true);
		expect(logTree[0].children[0].children[0].consumedTokens.completionTokens).toBe(7);

		expect(logTree[0].children[1].id).toBe('test-wf-id:test-node-id-b:0:1');
		expect(logTree[0].children[1].runIndex).toBe(1);
		expect(parentNodeName(logTree[0].children[1])).toBe('A');
		expect(logTree[0].children[1].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[1].consumedTokens.completionTokens).toBe(4);
		expect(logTree[0].children[1].children.length).toBe(1);

		expect(logTree[0].children[1].children[0].id).toBe('test-wf-id:test-node-id-c:0:1:1');
		expect(logTree[0].children[1].children[0].runIndex).toBe(1);
		expect(parentNodeName(logTree[0].children[1].children[0])).toBe('B');
		expect(logTree[0].children[1].children[0].consumedTokens.completionTokens).toBe(0);
	});

	it('should filter node executions based on source node', () => {
		const rootNode1 = createTestNode({ name: 'RootNode1' });
		const rootNode2 = createTestNode({ name: 'RootNode2' });
		const workflow = createTestWorkflowObject({
			nodes: [rootNode1, rootNode2, createTestNode({ name: 'SharedSubNode' })],
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
		const rootNode1Tree = getTreeNodeData(
			rootNode1,
			runData.RootNode1[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for RootNode2 - should only show SharedSubNode with source RootNode2
		const rootNode2Tree = getTreeNodeData(
			rootNode2,
			runData.RootNode2[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should filter node executions based on source run index', () => {
		const rootNode = createTestNode({ name: 'RootNode' });
		const workflow = createTestWorkflowObject({
			nodes: [rootNode, createTestNode({ name: 'SubNode' })],
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
		const rootNode1Tree = getTreeNodeData(
			rootNode,
			runData.RootNode[0],
			0,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for run #2 of RootNode - should only show SubNode with source run index 1
		const rootNode2Tree = getTreeNodeData(
			rootNode,
			runData.RootNode[1],
			1,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
	});

	it('should include nodes without source information', () => {
		const rootNode = createTestNode({ name: 'RootNode' });
		const workflow = createTestWorkflowObject({
			nodes: [rootNode, createTestNode({ name: 'SubNode' })],
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
		const rootNodeTree = getTreeNodeData(
			rootNode,
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should include nodes with empty source array', () => {
		const rootNode = createTestNode({ name: 'RootNode' });
		const workflow = createTestWorkflowObject({
			nodes: [rootNode, createTestNode({ name: 'SubNode' })],
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
		const rootNodeTree = getTreeNodeData(
			rootNode,
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
		expect(rootNodeTree[0].children[0].runIndex).toBe(0);
	});

	it('should include nodes with source array without previous node', () => {
		const rootNode = createTestNode({ name: 'RootNode' });
		const workflow = createTestWorkflowObject({
			nodes: [rootNode, createTestNode({ name: 'SubNode' })],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
			},
		});

		// Create test run data with source information
		const runData = {
			RootNode: [createTestTaskData({ executionIndex: 0 })],
			SubNode: [createTestTaskData({ executionIndex: 1, source: [null] })],
		};

		const rootNodeTree = getTreeNodeData(
			rootNode,
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);

		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
	});

	it('should filter deeper nested nodes based on source', () => {
		const rootNode1 = createTestNode({ name: 'RootNode1' });
		const rootNode2 = createTestNode({ name: 'RootNode2' });
		const workflow = createTestWorkflowObject({
			nodes: [
				rootNode1,
				rootNode2,
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
					source: [{ previousNode: 'RootNode1', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from RootNode1' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
					source: [{ previousNode: 'RootNode2', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from RootNode2' } }]] },
				}),
			],
			DeepSubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					executionIndex: 4,
					source: [{ previousNode: 'SharedSubNode', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from SharedSubNode run 0' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:05.000Z'),
					executionIndex: 5,
					source: [{ previousNode: 'SharedSubNode', previousNodeRun: 1 }],
					data: { main: [[{ json: { result: 'from SharedSubNode run 1' } }]] },
				}),
			],
		};

		// Test filtering for RootNode1
		const rootNode1Tree = getTreeNodeData(
			rootNode1,
			runData.RootNode1[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node.name).toBe('DeepSubNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0);

		// Test filtering for RootNode2
		const rootNode2Tree = getTreeNodeData(
			rootNode2,
			runData.RootNode2[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode2Tree[0].children[0].runIndex).toBe(1);
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node.name).toBe('DeepSubNode');
		expect(rootNode2Tree[0].children[0].children[0].runIndex).toBe(1);
	});

	it('should handle complex tree with multiple branches and filters correctly', () => {
		const rootNode1 = createTestNode({ name: 'RootNode1' });
		const rootNode2 = createTestNode({ name: 'RootNode2' });
		const workflow = createTestWorkflowObject({
			nodes: [
				rootNode1,
				rootNode2,
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
					source: [{ previousNode: 'RootNode1', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from RootNode1' } }]] },
				}),
			],
			SubNodeB: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 3,
					source: [{ previousNode: 'RootNode2', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from RootNode2' } }]] },
				}),
			],
			DeepNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:04.000Z'),
					executionIndex: 4,
					source: [{ previousNode: 'SubNodeA', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from SubNodeA' } }]] },
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:05.000Z'),
					executionIndex: 5,
					source: [{ previousNode: 'SubNodeB', previousNodeRun: 0 }],
					data: { main: [[{ json: { result: 'from SubNodeB' } }]] },
				}),
			],
		};

		// Test filtering for RootNode1 -> SubNodeA -> DeepNode
		const rootNode1Tree = getTreeNodeData(
			rootNode1,
			runData.RootNode1[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNodeA');
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node.name).toBe('DeepNode');
		expect(rootNode1Tree[0].children[0].children[0].runIndex).toBe(0); // First DeepNode execution

		// Test filtering for RootNode2 -> SubNodeB -> DeepNode
		const rootNode2Tree = getTreeNodeData(
			rootNode2,
			runData.RootNode2[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);

		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SubNodeB');
		expect(rootNode2Tree[0].children[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].children[0].node.name).toBe('DeepNode');

		const deepNodeRunIndex = rootNode2Tree[0].children[0].children[0].runIndex;
		expect(typeof deepNodeRunIndex).toBe('number');
	});

	it('should treat missing previousNodeRun in source as 0', () => {
		const rootNode = createTestNode({ name: 'RootNode' });
		const workflow = createTestWorkflowObject({
			nodes: [
				rootNode,
				createTestNode({ name: 'SubNode' }),
				createTestNode({ name: 'NestedNode' }),
			],
			connections: {
				SubNode: {
					ai_tool: [[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
				},
				NestedNode: {
					ai_tool: [[{ node: 'SubNode', type: NodeConnectionTypes.AiTool, index: 0 }]],
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
			],
			SubNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					executionIndex: 1,
					source: [{ previousNode: 'RootNode', previousNodeRun: undefined }],
					data: { main: [[{ json: { result: 'from RootNode' } }]] },
				}),
			],
			NestedNode: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					executionIndex: 2,
					source: [{ previousNode: 'SubNode', previousNodeRun: undefined }],
					data: { main: [[{ json: { result: 'from SubNode' } }]] },
				}),
			],
		};

		const rootNode1Tree = getTreeNodeData(
			rootNode,
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode1Tree[0].children[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].children[0].node.name).toBe('NestedNode');
	});
});

describe(findSelectedLogEntry, () => {
	function find(state: LogEntrySelection, response: IExecutionResponse, isExecuting: boolean) {
		return findSelectedLogEntry(
			state,
			createLogTree(createTestWorkflowObject(response.workflowData), response),
			isExecuting,
		);
	}

	describe('when execution is finished and log is not manually selected', () => {
		it('should return undefined if no execution data exists', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: createEmptyRunExecutionData(),
			});

			expect(find({ type: 'initial' }, response, false)).toBe(undefined);
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
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
							B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
							C: [
								createTestTaskData({ executionStatus: 'success', startTime: 2 }),
								createTestTaskData({
									error: {} as ExecutionError,
									executionStatus: 'error',
									startTime: 3,
								}),
								createTestTaskData({
									error: {} as ExecutionError,
									executionStatus: 'error',
									startTime: 4,
								}),
							],
						},
					},
				}),
			});

			expect(find({ type: 'initial' }, response, false)).toEqual(
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
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
							B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
							C: [
								createTestTaskData({ executionStatus: 'success', startTime: 2 }),
								createTestTaskData({
									error: {} as ExecutionError,
									executionStatus: 'error',
									startTime: 3,
								}),
								createTestTaskData({
									error: {} as ExecutionError,
									executionStatus: 'error',
									startTime: 4,
								}),
							],
						},
					},
				}),
			});

			expect(find({ type: 'initial' }, response, false)).toEqual(
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
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
							B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
							C: [
								createTestTaskData({ executionStatus: 'success', startTime: 2 }),
								createTestTaskData({ executionStatus: 'success', startTime: 3 }),
								createTestTaskData({ executionStatus: 'success', startTime: 4 }),
							],
						},
					},
				}),
			});

			expect(find({ type: 'initial' }, response, false)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
			);
		});

		it('should return first log entry with error when it appears after a log entry for AI agent', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B', type: AGENT_LANGCHAIN_NODE_TYPE }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
							B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
							C: [
								createTestTaskData({
									executionStatus: 'success',
									error: {} as ExecutionError,
									startTime: 2,
								}),
							],
						},
					},
				}),
			});

			expect(find({ type: 'initial' }, response, false)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
			);
		});

		it('should return last log entry if there is no log entry with error nor executed AI agent node', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
							B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
							C: [
								createTestTaskData({ executionStatus: 'success', startTime: 2 }),
								createTestTaskData({ executionStatus: 'success', startTime: 3 }),
								createTestTaskData({ executionStatus: 'success', startTime: 4 }),
							],
						},
					},
				}),
			});

			expect(find({ type: 'initial' }, response, false)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 2 }),
			);
		});
	});

	describe('when log is manually selected', () => {
		const nodeA = createTestNode({ name: 'A', id: 'a' });
		const nodeB = createTestNode({ name: 'B', id: 'b' });
		const workflowData = createTestWorkflow({
			id: 'test-wf-id',
			nodes: [nodeA, nodeB],
		});
		const response = createTestWorkflowExecutionResponse({
			workflowData,
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [
							createTestTaskData({ executionStatus: 'success' }),
							createTestTaskData({ executionStatus: 'success' }),
							createTestTaskData({ executionStatus: 'success' }),
						],
						B: [createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' })],
					},
				},
			}),
		});

		it('should return manually selected log', () => {
			const result = find(
				{ type: 'selected', entry: createTestLogEntry({ id: 'test-wf-id:a:0' }) },
				response,
				false,
			);

			expect(result).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
		});

		it('should return the log with same node and closest run index as selected if the exact run index is not found in logs', () => {
			const result = find(
				{
					type: 'selected',
					entry: createTestLogEntry({
						id: 'test-wf-id:a:4',
						executionId: response.id,
						node: nodeA,
						runIndex: 4,
						workflow: createTestWorkflowObject(workflowData),
					}),
				},
				response,
				false,
			);

			expect(result).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 2 }),
			);
		});

		it('should not fallback to the closest run index while executing', () => {
			const result = find(
				{
					type: 'selected',
					entry: createTestLogEntry({
						id: 'test-wf-id:a:4',
						executionId: response.id,
						node: nodeA,
						runIndex: 4,
						workflow: createTestWorkflowObject(workflowData),
					}),
				},
				response,
				true,
			);

			expect(result).toBe(undefined);
		});
	});
});

describe(createLogTree, () => {
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
		const execution = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
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
								startTime: Date.parse('2025-04-04T00:00:02.000Z'),
								executionIndex: 2,
							}),
						],
					},
				},
			}),
		});

		expect(createLogTree(workflow, execution)).toEqual([
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
			createLogTree(
				workflow,
				createTestWorkflowExecutionResponse({
					data: createRunExecutionData({
						resultData: {
							runData: {
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
										startTime: Date.parse('2025-04-04T00:00:02.000Z'),
										executionIndex: 2,
									}),
								],
							},
						},
					}),
				}),
			),
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
		const response = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData()],
					},
				},
			}),
		});

		expect(createLogTree(workflow, response)).toEqual([
			expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) }),
		]);
	});

	it('should include runs of a sub execution', () => {
		const workflow = createTestWorkflowObject({
			id: 'root-workflow-id',
			nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B' })],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const subWorkflow = createTestWorkflowObject({
			id: 'sub-workflow-id',
			nodes: [createTestNode({ name: 'C' })],
		});
		const rootExecutionData = createTestWorkflowExecutionResponse({
			id: 'root-exec-id',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [
							createTestTaskData({
								metadata: {
									subExecution: { workflowId: 'sub-workflow-id', executionId: 'sub-exec-id' },
								},
							}),
						],
					},
				},
			}),
		});
		const subExecutionData = createRunExecutionData({
			resultData: { runData: { C: [createTestTaskData(), createTestTaskData()] } },
		});
		const logs = createLogTree(
			workflow,
			rootExecutionData,
			{ 'sub-workflow-id': subWorkflow },
			{ 'sub-exec-id': subExecutionData },
		);

		expect(logs).toHaveLength(2);

		expect(logs[0].node.name).toBe('A');
		expect(logs[0].workflow).toBe(workflow);
		expect(logs[0].execution).toBe(rootExecutionData.data);
		expect(logs[0].executionId).toBe('root-exec-id');
		expect(logs[0].children).toHaveLength(0);

		expect(logs[1].node.name).toBe('B');
		expect(logs[1].workflow).toBe(workflow);
		expect(logs[1].execution).toBe(rootExecutionData.data);
		expect(logs[1].executionId).toBe('root-exec-id');
		expect(logs[1].children).toHaveLength(2);

		expect(logs[1].children[0].node.name).toBe('C');
		expect(logs[1].children[0].workflow).toBe(subWorkflow);
		expect(logs[1].children[0].execution).toBe(subExecutionData);
		expect(logs[1].children[0].executionId).toBe('sub-exec-id');
		expect(logs[1].children[0].children).toHaveLength(0);

		expect(logs[1].children[1].node.name).toBe('C');
		expect(logs[1].children[1].workflow).toBe(subWorkflow);
		expect(logs[1].children[1].execution).toBe(subExecutionData);
		expect(logs[1].children[1].executionId).toBe('sub-exec-id');
		expect(logs[1].children[1].children).toHaveLength(0);
	});

	it('should include all runs of sub nodes in sub execution under correct parent run', () => {
		const workflow = createTestWorkflowObject({
			id: 'root-workflow-id',
			nodes: [createTestNode({ name: 'A' })],
		});
		const subWorkflow = createTestWorkflowObject({
			id: 'sub-workflow-id',
			nodes: [createTestNode({ name: 'B' }), createTestNode({ name: 'C' })],
			connections: {
				C: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
		});
		const rootExecutionData = createTestWorkflowExecutionResponse({
			id: 'root-exec-id',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [
							createTestTaskData({
								metadata: {
									subExecution: { workflowId: 'sub-workflow-id', executionId: 'sub-exec-id' },
								},
							}),
						],
					},
				},
			}),
		});
		const subExecutionData = createRunExecutionData({
			resultData: {
				runData: {
					B: [createTestTaskData(), createTestTaskData()],
					C: [
						createTestTaskData({ source: [{ previousNode: 'B', previousNodeRun: 0 }] }),
						createTestTaskData({ source: [{ previousNode: 'B', previousNodeRun: 1 }] }),
						createTestTaskData({ source: [{ previousNode: 'B', previousNodeRun: 1 }] }),
					],
				},
			},
		});
		const logs = createLogTree(
			workflow,
			rootExecutionData,
			{ 'sub-workflow-id': subWorkflow },
			{ 'sub-exec-id': subExecutionData },
		);

		expect(logs).toHaveLength(1);
		expect(logs[0].node.name).toBe('A');
		expect(logs[0].children).toHaveLength(2);
		expect(logs[0].children[0].node.name).toBe('B');
		expect(logs[0].children[0].children).toHaveLength(1);
		expect(logs[0].children[0].children[0].node.name).toBe('C');
		expect(logs[0].children[1].node.name).toBe('B');
		expect(logs[0].children[1].children).toHaveLength(2);
		expect(logs[0].children[1].children[0].node.name).toBe('C');
		expect(logs[0].children[1].children[1].node.name).toBe('C');
	});

	it('should not include nodes without run data', () => {
		const logs = createLogTree(
			createTestWorkflowObject(aiChatWorkflow),
			createTestWorkflowExecutionResponse({
				data: createEmptyRunExecutionData(),
			}),
		);

		expect(logs).toHaveLength(0);
	});

	it('should include sub node log without run data in its root node', () => {
		const taskData = createTestTaskData({
			source: [{ previousNode: 'PartialExecutionToolExecutor' }],
		});
		const logs = createLogTree(
			createTestWorkflowObject(aiChatWorkflow),
			createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					resultData: { runData: { [aiModelNode.name]: [taskData] } },
				}),
			}),
		);

		expect(logs).toHaveLength(1);
		expect(logs[0].node.name).toBe(aiAgentNode.name);
		expect(logs[0].runData).toBe(undefined);
		expect(logs[0].children).toHaveLength(1);
		expect(logs[0].children[0].node.name).toBe(aiModelNode.name);
	});

	it('should include sub node log with its root node disabled', () => {
		const taskData = createTestTaskData({
			source: [{ previousNode: 'PartialExecutionToolExecutor' }],
		});
		const logs = createLogTree(
			createTestWorkflowObject({
				...aiChatWorkflow,
				nodes: [{ ...aiAgentNode, disabled: true }, aiModelNode],
			}),
			createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					resultData: { runData: { [aiModelNode.name]: [taskData] } },
				}),
			}),
		);

		expect(logs).toHaveLength(1);
		expect(logs[0].node.name).toBe(aiAgentNode.name);
		expect(logs[0].runData).toBe(undefined);
		expect(logs[0].children).toHaveLength(1);
		expect(logs[0].children[0].node.name).toBe(aiModelNode.name);
	});

	it('should not include duplicate sub node log when the node belongs to multiple root nodes with no run data', () => {
		const taskData = createTestTaskData({
			source: [{ previousNode: 'PartialExecutionToolExecutor' }],
		});
		const logs = createLogTree(
			createTestWorkflowObject({
				nodes: [
					{ ...aiAgentNode, name: 'Agent A' },
					{ ...aiAgentNode, name: 'Agent B' },
					aiModelNode,
				],
				connections: {
					[aiModelNode.name]: {
						[NodeConnectionTypes.AiLanguageModel]: [
							[
								{ node: 'Agent A', index: 0, type: NodeConnectionTypes.AiLanguageModel },
								{ node: 'Agent B', index: 0, type: NodeConnectionTypes.AiLanguageModel },
							],
						],
					},
				},
			}),
			createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					resultData: { runData: { [aiModelNode.name]: [taskData] } },
				}),
			}),
		);

		expect(logs).toHaveLength(1);
		expect(logs[0].node.name).toBe('Agent B');
		expect(logs[0].runData).toBe(undefined);
		expect(logs[0].children).toHaveLength(1);
		expect(logs[0].children[0].node.name).toBe(aiModelNode.name);
	});

	it('should not duplicate parent node placeholder when multiple child nodes have the same parent without run data', () => {
		// This test covers the AI-1726 bug scenario:
		// When AI Agent execution finishes with error, the agent is NOT in runData
		// But its child nodes (LLM and tools) ARE in runData
		// Each child tries to insert the AI Agent as a placeholder
		// Before the fix: AI Agent appeared twice (once per child)
		// After the fix: AI Agent appears only once
		const llmNode = createTestNode({ name: 'Anthropic Chat Model' });
		const toolNode = createTestNode({ name: 'HTTP Request' });
		const logs = createLogTree(
			createTestWorkflowObject({
				nodes: [aiAgentNode, llmNode, toolNode],
				connections: {
					[llmNode.name]: {
						[NodeConnectionTypes.AiLanguageModel]: [
							[{ node: aiAgentNode.name, index: 0, type: NodeConnectionTypes.AiLanguageModel }],
						],
					},
					[toolNode.name]: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: aiAgentNode.name, index: 0, type: NodeConnectionTypes.AiTool }],
						],
					},
				},
			}),
			createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					resultData: {
						runData: {
							// AI Agent is NOT in runData (error case)
							[llmNode.name]: [createTestTaskData()],
							[toolNode.name]: [createTestTaskData()],
						},
					},
				}),
			}),
		);

		// Should have only ONE AI Agent entry (not duplicated)
		expect(logs).toHaveLength(1);
		expect(logs[0].node.name).toBe(aiAgentNode.name);
		expect(logs[0].runData).toBe(undefined); // Placeholder has no runData
		expect(logs[0].children).toHaveLength(2); // Both child nodes
		expect(logs[0].children.map((c) => c.node.name)).toEqual(
			expect.arrayContaining([llmNode.name, toolNode.name]),
		);
	});
});

describe(processFiles, () => {
	it('should process files correctly', async () => {
		const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
		const result = await processFiles([mockFile]);

		expect(result).toEqual([
			{
				name: 'test.txt',
				type: 'text/plain',
				data: 'data:text/plain;base64,dGVzdCBjb250ZW50',
			},
		]);
	});

	it('should return an empty array if no files are provided', async () => {
		expect(await processFiles(undefined)).toEqual([]);
		expect(await processFiles([])).toEqual([]);
	});
});

describe('extractBotResponse', () => {
	it('should extract a successful bot response', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						data: {
							main: [[{ json: { message: 'Test output' } }]],
						},
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: 'Test output',
			sender: 'bot',
			id: executionId,
		});
	});

	it('should extract an error bot response', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						error: {
							message: 'Test error',
						} as unknown as ExecutionError,
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: '[ERROR: Test error]',
			sender: 'bot',
			id: 'test-exec-id',
		});
	});

	it('should return undefined if no response data is available', () => {
		const resultData = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toBeUndefined();
	});

	it('should return undefined if lastNodeExecuted is not available', () => {
		const resultData = {
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toBeUndefined();
	});

	it('should extract response from second output branch when first is empty', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						data: {
							main: [
								[], // First output branch is empty
								[{ json: { message: 'Response from second branch' } }], // Second branch has response
							],
						},
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: 'Response from second branch',
			sender: 'bot',
			id: executionId,
		});
	});

	it('should extract response from second branch when first has empty json', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						data: {
							main: [
								[{ json: {} }], // First branch has empty json object
								[{ json: { text: 'Response from second branch' } }], // Second branch has response
							],
						},
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: 'Response from second branch',
			sender: 'bot',
			id: executionId,
		});
	});

	it('should extract response from first available branch when multiple exist', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						data: {
							main: [
								[], // First branch empty
								[{ json: {} }], // Second branch has empty object
								[{ json: { output: 'Response from third branch' } }], // Third branch has response
							],
						},
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: 'Response from third branch',
			sender: 'bot',
			id: executionId,
		});
	});

	it('should use response from first branch when multiple branches have valid text', () => {
		const resultData: IRunExecutionData['resultData'] = {
			lastNodeExecuted: 'nodeA',
			runData: {
				nodeA: [
					{
						executionTime: 1,
						startTime: 1,
						executionIndex: 1,
						source: [],
						data: {
							main: [
								[{ json: { text: 'First branch response' } }],
								[{ json: { text: 'Second branch response' } }],
							],
						},
					},
				],
			},
		};
		const executionId = 'test-exec-id';
		const result = extractBotResponse(resultData, executionId);
		expect(result).toEqual({
			text: 'First branch response',
			sender: 'bot',
			id: executionId,
		});
	});
});

describe(mergeStartData, () => {
	it('should return unchanged execution response if start data is empty', () => {
		const response = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData(), createTestTaskData()],
					},
				},
			}),
		});

		expect(mergeStartData({}, response)).toEqual(response);
	});

	it('should add runs in start data to the execution response as running state', () => {
		const response = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
						B: [
							createTestTaskData({ startTime: 1, executionIndex: 1 }),
							createTestTaskData({ startTime: 2, executionIndex: 2 }),
						],
					},
				},
			}),
		});
		const startData: { [nodeName: string]: ITaskStartedData[] } = {
			B: [{ startTime: 3, executionIndex: 3, source: [] }],
			C: [{ startTime: 4, executionIndex: 4, source: [] }],
		};
		const merged = mergeStartData(startData, response);

		expect(merged.data?.resultData.runData.A).toEqual(response.data?.resultData.runData.A);
		expect(merged.data?.resultData.runData.B).toEqual([
			response.data!.resultData.runData.B[0],
			response.data!.resultData.runData.B[1],
			{ ...startData.B[0], executionStatus: 'running', executionTime: 0 },
		]);
		expect(merged.data?.resultData.runData.C).toEqual([
			{ ...startData.C[0], executionStatus: 'running', executionTime: 0 },
		]);
	});

	it('should not add runs in start data if a run with the same executionIndex already exists in response', () => {
		const response = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ executionIndex: 0 })],
					},
				},
			}),
		});
		const startData = {
			A: [createTestTaskData({ executionIndex: 0 })],
		};
		const merged = mergeStartData(startData, response);

		expect(merged.data?.resultData.runData.A).toEqual(response.data?.resultData.runData.A);
	});

	it('should not add runs in start data if a run for the same node with larger start time already exists in response', () => {
		const response = createTestWorkflowExecutionResponse({
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
					},
				},
			}),
		});
		const startData = {
			A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
		};
		const merged = mergeStartData(startData, response);

		expect(merged.data?.resultData.runData.A).toEqual(response.data?.resultData.runData.A);
	});
});

describe(getDefaultCollapsedEntries, () => {
	it('should recursively find logs for runs with a sub execution and has no child logs', () => {
		const entries = [
			// Has sub execution and has no children
			createTestLogEntry({
				id: 'l0',
				runData: createTestTaskData({
					metadata: { subExecution: { workflowId: 'w0', executionId: 'e0' } },
				}),
				children: [],
			}),
			// Has no sub execution
			createTestLogEntry({ id: 'l1' }),
			// Has sub execution and has children
			createTestLogEntry({
				id: 'l2',
				runData: createTestTaskData({
					metadata: { subExecution: { workflowId: 'w0', executionId: 'e0' } },
				}),
				children: [
					// Has no sub execution - nested
					createTestLogEntry({ id: 'l3' }),
					// Has sub execution and has no children - nested
					createTestLogEntry({
						id: 'l4',
						runData: createTestTaskData({
							metadata: {
								subExecution: { workflowId: 'w0', executionId: 'e0' },
							},
						}),
					}),
				],
			}),
		];

		expect(getDefaultCollapsedEntries(entries)).toEqual({ l0: true, l4: true });
	});
});

describe(restoreChatHistory, () => {
	it('should return extracted chat input and bot message from workflow execution data', () => {
		expect(
			restoreChatHistory({
				id: 'test-exec-id',
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A', type: CHAT_TRIGGER_NODE_TYPE }),
						createTestNode({ name: 'B', type: AGENT_NODE_TYPE }),
					],
				}),
				data: createRunExecutionData({
					resultData: {
						lastNodeExecuted: 'B',
						runData: {
							A: [
								createTestTaskData({
									startTime: Date.parse('2025-04-20T00:00:01.000Z'),
									data: { [NodeConnectionTypes.Main]: [[{ json: { chatInput: 'test input' } }]] },
								}),
							],
							B: [
								createTestTaskData({
									startTime: Date.parse('2025-04-20T00:00:02.000Z'),
									executionTime: 999,
									data: { [NodeConnectionTypes.Main]: [[{ json: { output: 'test output' } }]] },
								}),
							],
						},
					},
				}),
				finished: true,
				mode: 'manual',
				status: 'success',
				startedAt: '2025-04-20T00:00:00.000Z',
				createdAt: '2025-04-20T00:00:00.000Z',
			}),
		).toEqual([
			{ id: expect.any(String), sender: 'user', text: 'test input' },
			{ id: 'test-exec-id', sender: 'bot', text: 'test output' },
		]);
	});
});

describe(findSubExecutionLocator, () => {
	it('should return undefined if given log entry has no related sub execution', () => {
		const found = findSubExecutionLocator(
			createTestLogEntry({
				runData: createTestTaskData({
					metadata: {},
				}),
			}),
		);

		expect(found).toBe(undefined);
	});

	it('should find workflowId and executionId in metadata', () => {
		const found = findSubExecutionLocator(
			createTestLogEntry({
				runData: createTestTaskData({
					metadata: { subExecution: { workflowId: 'w0', executionId: 'e0' } },
				}),
			}),
		);

		expect(found).toEqual({ workflowId: 'w0', executionId: 'e0' });
	});

	it('should find workflowId and executionId in error object', () => {
		const found = findSubExecutionLocator(
			createTestLogEntry({
				runData: createTestTaskData({
					error: {
						errorResponse: { workflowId: 'w1', executionId: 'e1' },
					} as unknown as ExecutionError,
				}),
			}),
		);

		expect(found).toEqual({ workflowId: 'w1', executionId: 'e1' });
	});
});

describe(wrapLogEntriesInGroups, () => {
	const triggerNode = createTestNode({ name: 'Trigger', id: 'id-trigger' });
	const nodeA = createTestNode({ name: 'A', id: 'id-a' });
	const nodeB = createTestNode({ name: 'B', id: 'id-b' });
	const nodeC = createTestNode({ name: 'C', id: 'id-c' });

	function buildTree(
		runData: IRunExecutionData['resultData']['runData'],
		nodes: INodeUi[] = [triggerNode, nodeA, nodeB, nodeC],
		connections: IConnections = {
			Trigger: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	) {
		const workflow = createTestWorkflowObject({ id: 'wf-1', nodes, connections });
		const response = createTestWorkflowExecutionResponse({
			id: 'exec-1',
			workflowData: createTestWorkflow({ id: 'wf-1', nodes }),
			data: createRunExecutionData({ resultData: { runData } }),
		});
		return createLogTree(workflow, response);
	}

	const tokenUsage = (total: number) => ({
		tokenUsage: { completionTokens: total, promptTokens: 0, totalTokens: total },
	});

	it('returns entries unchanged when no groups are given', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
		});

		expect(wrapLogEntriesInGroups(tree, [])).toBe(tree);
	});

	it('wraps grouped root entries under a single group entry', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4 })],
		});

		const result = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'My group', nodeIds: ['id-b', 'id-c'] },
		]);

		// Trigger, A, then the group (placed at the earliest member's time)
		expect(result).toHaveLength(3);
		const group = result[2];
		expect(isLogGroupEntry(group)).toBe(true);
		if (!isLogGroupEntry(group)) return;

		expect(group.group.name).toBe('My group');
		expect(group.id).toBe('group:wf-1:g1');
		expect(group.children).toHaveLength(2);
		expect(group.children.every((c) => c.parent === group)).toBe(true);
		expect(group.children[0].node.name).toBe('B');
		expect(group.children[1].node.name).toBe('C');
	});

	it('sets inputLogEntry to the earliest member and outputLogEntry to the latest', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4 })],
		});

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]).filter(isLogGroupEntry);

		expect(group.inputLogEntry.node.name).toBe('B');
		expect(group.outputLogEntry.node.name).toBe('C');
	});

	it('places the group chronologically by its earliest member', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 10 })],
			B: [createTestTaskData({ startTime: 2 })],
			C: [createTestTaskData({ startTime: 3 })],
		});

		const result = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]);

		// Group's earliest member (B@2) precedes ungrouped A@10
		expect(result.map((e) => (isLogGroupEntry(e) ? e.group.name : e.node.name))).toEqual([
			'Trigger',
			'G',
			'A',
		]);
	});

	it('rolls up an error status from any member', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4, executionStatus: 'error' })],
		});

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]).filter(isLogGroupEntry);

		expect(group.executionStatus).toBe('error');
	});

	it('rolls up success when all members succeed', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4 })],
		});

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]).filter(isLogGroupEntry);

		expect(group.executionStatus).toBe('success');
	});

	it('sums consumed tokens across members', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3, data: { main: [[{ json: tokenUsage(3) }]] } })],
			C: [createTestTaskData({ startTime: 4, data: { main: [[{ json: tokenUsage(6) }]] } })],
		});

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]).filter(isLogGroupEntry);

		expect(group.consumedTokens.totalTokens).toBe(9);
	});

	it('only wraps members that produced run data (partial execution)', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
		});

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]).filter(isLogGroupEntry);

		expect(group.children).toHaveLength(1);
		expect(group.executedMemberCount).toBe(1);
		expect(group.inputLogEntry.node.name).toBe('B');
		expect(group.outputLogEntry.node.name).toBe('B');
	});

	it('preserves AI sub-node nesting inside a group (group → agent → sub-node)', () => {
		const agentNode = createTestNode({ name: 'Agent', id: 'id-agent' });
		const modelNode = createTestNode({ name: 'Model', id: 'id-model' });
		const tree = buildTree(
			{
				Trigger: [createTestTaskData({ startTime: 1 })],
				Agent: [createTestTaskData({ startTime: 2 })],
				Model: [
					createTestTaskData({
						startTime: 3,
						source: [{ previousNode: 'Agent', previousNodeRun: 0 }],
					}),
				],
			},
			[triggerNode, agentNode, modelNode],
			{
				Trigger: { main: [[{ node: 'Agent', type: NodeConnectionTypes.Main, index: 0 }]] },
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
		);

		const [group] = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-agent'] },
		]).filter(isLogGroupEntry);

		expect(group.children).toHaveLength(1);
		expect(group.children[0].node.name).toBe('Agent');
		expect(group.children[0].children[0].node.name).toBe('Model');
	});

	it('default-collapses group entries', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4 })],
		});

		const result = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]);

		expect(getDefaultCollapsedEntries(result)).toEqual({ 'group:wf-1:g1': true });
	});

	it('does not collapse a group whose member errored', () => {
		const tree = buildTree({
			Trigger: [createTestTaskData({ startTime: 1 })],
			A: [createTestTaskData({ startTime: 2 })],
			B: [createTestTaskData({ startTime: 3 })],
			C: [createTestTaskData({ startTime: 4, executionStatus: 'error' })],
		});

		const result = wrapLogEntriesInGroups(tree, [
			{ id: 'g1', name: 'G', nodeIds: ['id-b', 'id-c'] },
		]);

		expect(getDefaultCollapsedEntries(result)).toEqual({});
	});
});

describe('group input / output entries', () => {
	const triggerNode = createTestNode({ name: 'Trigger', id: 'id-trigger' });
	const nodeA = createTestNode({ name: 'A', id: 'id-a' });
	const nodeB = createTestNode({ name: 'B', id: 'id-b' });
	const nodeC = createTestNode({ name: 'C', id: 'id-c' });
	const nodeD = createTestNode({ name: 'D', id: 'id-d' });
	const nodeE = createTestNode({ name: 'E', id: 'id-e' });

	const mainTo = (node: string) => ({
		main: [[{ node, type: NodeConnectionTypes.Main, index: 0 }]],
	});

	const mainBranch = (...nodes: string[]) => ({
		main: nodes.map((node) => [{ node, type: NodeConnectionTypes.Main, index: 0 }]),
	});

	function buildGroup(
		runData: IRunExecutionData['resultData']['runData'],
		nodeIds: string[],
		options?: { nodes?: INodeUi[]; connections?: IConnections },
	) {
		const nodes = options?.nodes ?? [triggerNode, nodeA, nodeB, nodeC];
		const connections = options?.connections ?? {
			Trigger: mainTo('A'),
			A: mainTo('B'),
			B: mainTo('C'),
		};
		const workflow = createTestWorkflowObject({ id: 'wf-1', nodes, connections });
		const response = createTestWorkflowExecutionResponse({
			id: 'exec-1',
			workflowData: createTestWorkflow({ id: 'wf-1', nodes }),
			data: createRunExecutionData({ resultData: { runData } }),
		});
		const [group] = wrapLogEntriesInGroups(createLogTree(workflow, response), [
			{ id: 'g1', name: 'G', nodeIds },
		]).filter(isLogGroupEntry);
		return group;
	}

	const baseRunData = {
		Trigger: [createTestTaskData({ startTime: 1 })],
		A: [createTestTaskData({ startTime: 2 })],
		B: [createTestTaskData({ startTime: 3 })],
		C: [createTestTaskData({ startTime: 4 })],
		D: [createTestTaskData({ startTime: 5 })],
	};

	describe(getGroupInputEntries, () => {
		it('returns only root members (not targeted by any internal connection)', () => {
			// a → b → [c, d],  group [a, b, c, d]
			const group = buildGroup(baseRunData, ['id-a', 'id-b', 'id-c', 'id-d'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC, nodeD],
				connections: {
					Trigger: mainTo('A'),
					A: mainTo('B'),
					B: mainBranch('C', 'D'),
				},
			});

			expect(getGroupInputEntries(group).map((e) => e.node.name)).toEqual(['A']);
		});

		it('returns a single root for a linear group', () => {
			// a → b → c, group [b, c]
			const group = buildGroup(baseRunData, ['id-b', 'id-c'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC],
				connections: { Trigger: mainTo('A'), A: mainTo('B'), B: mainTo('C') },
			});

			expect(getGroupInputEntries(group).map((e) => e.node.name)).toEqual(['B']);
		});

		it('returns the single member for a one-member group', () => {
			const group = buildGroup(baseRunData, ['id-b'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC],
				connections: { Trigger: mainTo('A'), A: mainTo('B'), B: mainTo('C') },
			});

			expect(getGroupInputEntries(group).map((e) => e.node.name)).toEqual(['B']);
		});

		it('deduplicates a member with multiple runs to its first run', () => {
			const group = buildGroup(
				{
					Trigger: [createTestTaskData({ startTime: 1 })],
					A: [createTestTaskData({ startTime: 2 })],
					B: [
						createTestTaskData({ startTime: 3, executionIndex: 1 }),
						createTestTaskData({ startTime: 5, executionIndex: 3 }),
					],
					C: [createTestTaskData({ startTime: 4, executionIndex: 2 })],
				},
				['id-b', 'id-c'],
				{
					nodes: [triggerNode, nodeA, nodeB, nodeC],
					connections: { Trigger: mainTo('A'), A: mainTo('B'), B: mainTo('C') },
				},
			);

			const entries = getGroupInputEntries(group);
			expect(entries).toHaveLength(1);
			expect(entries[0].node.name).toBe('B');
			expect(entries[0].runIndex).toBe(0);
		});

		it('falls back to inputLogEntry when no root is found', () => {
			// Cyclic group where every member is targeted by another member.
			// In practice validation prevents this, but the fallback keeps the pane non-empty.
			const group = buildGroup(baseRunData, ['id-a', 'id-b'], {
				nodes: [triggerNode, nodeA, nodeB],
				connections: {
					Trigger: mainTo('A'),
					A: mainTo('B'),
					B: mainTo('A'),
				},
			});

			expect(getGroupInputEntries(group)).toEqual([group.inputLogEntry]);
		});
	});

	describe(getGroupOutputEntries, () => {
		it('returns leaf members for a branched group', () => {
			// a → b → [c, d],  group [a, b, c, d]
			const group = buildGroup(baseRunData, ['id-a', 'id-b', 'id-c', 'id-d'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC, nodeD],
				connections: {
					Trigger: mainTo('A'),
					A: mainTo('B'),
					B: mainBranch('C', 'D'),
				},
			});

			expect(getGroupOutputEntries(group).map((e) => e.node.name)).toEqual(['C', 'D']);
		});

		it('includes leaves that pass data externally', () => {
			// a → b → [c → e (external), d],  group [a, b, c, d]
			const group = buildGroup(
				{ ...baseRunData, E: [createTestTaskData({ startTime: 6 })] },
				['id-a', 'id-b', 'id-c', 'id-d'],
				{
					nodes: [triggerNode, nodeA, nodeB, nodeC, nodeD, nodeE],
					connections: {
						Trigger: mainTo('A'),
						A: mainTo('B'),
						B: mainBranch('C', 'D'),
						C: mainTo('E'),
					},
				},
			);

			expect(getGroupOutputEntries(group).map((e) => e.node.name)).toEqual(['C', 'D']);
		});

		it('returns a single leaf for a linear group', () => {
			// a → b → c, group [b, c]
			const group = buildGroup(baseRunData, ['id-b', 'id-c'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC],
				connections: { Trigger: mainTo('A'), A: mainTo('B'), B: mainTo('C') },
			});

			expect(getGroupOutputEntries(group).map((e) => e.node.name)).toEqual(['C']);
		});

		it('returns the single member for a one-member group', () => {
			const group = buildGroup(baseRunData, ['id-b'], {
				nodes: [triggerNode, nodeA, nodeB, nodeC],
				connections: { Trigger: mainTo('A'), A: mainTo('B'), B: mainTo('C') },
			});

			expect(getGroupOutputEntries(group).map((e) => e.node.name)).toEqual(['B']);
		});

		it('falls back to outputLogEntry when no leaf is found', () => {
			// Cyclic group where every member has an outgoing internal connection.
			const group = buildGroup(baseRunData, ['id-a', 'id-b'], {
				nodes: [triggerNode, nodeA, nodeB],
				connections: {
					Trigger: mainTo('A'),
					A: mainTo('B'),
					B: mainTo('A'),
				},
			});

			expect(getGroupOutputEntries(group)).toEqual([group.outputLogEntry]);
		});
	});
});
