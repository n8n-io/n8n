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
	getGroupExecutionStatus,
	getGroupTiming,
	getSubtreeTotalConsumedTokens,
	getTreeNodeData,
	isSubNodeLog,
	mergeStartData,
	restoreChatHistory,
	processFiles,
	extractBotResponse,
} from './logs.utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	createEmptyRunExecutionData,
	createRunExecutionData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { ExecutionError, ITaskData, ITaskStartedData, IRunExecutionData } from 'n8n-workflow';
import {
	aiAgentNode,
	aiChatWorkflow,
	aiModelNode,
	createTestLogTreeCreationContext,
} from './__test__/data';
import {
	type GroupLogEntry,
	type LogEntry,
	type LogEntrySelection,
	type NodeLogEntry,
	isGroupLog,
	isNodeLog,
} from './logs.types';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { createTestLogEntry } from './__test__/mocks';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';

// A log tree of node entries only, all the way down (overrides the union-typed
// `children`/`parent` so assertions can read `.node`/`.runData` at any depth).
type NodeTreeEntry = Omit<NodeLogEntry, 'children' | 'parent'> & {
	parent?: NodeTreeEntry;
	children: NodeTreeEntry[];
};

// These tests never pass canvas groups, so the builder result can only contain node
// entries. Assert that recursively to narrow the tree without an unchecked cast.
function assertNodeTree(entries: LogEntry[]): asserts entries is NodeTreeEntry[] {
	for (const entry of entries) {
		if (!isNodeLog(entry)) {
			throw new Error(`Expected a node log entry but got a "${entry.type}" entry`);
		}
		assertNodeTree(entry.children);
	}
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
		assertNodeTree(logTree);

		expect(logTree.length).toBe(1);

		expect(logTree[0].id).toBe('test-wf-id:test-node-id-a:0');
		expect(logTree[0].runIndex).toBe(0);
		expect(logTree[0].parent).toBe(undefined);
		expect(logTree[0].runData?.startTime).toBe(1740528000000);
		expect(logTree[0].children.length).toBe(2);

		expect(logTree[0].children[0].id).toBe('test-wf-id:test-node-id-b:0:0');
		expect(logTree[0].children[0].runIndex).toBe(0);
		expect(logTree[0].children[0].parent?.node.name).toBe('A');
		expect(logTree[0].children[0].runData?.startTime).toBe(1740528000001);
		expect(logTree[0].children[0].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[0].consumedTokens.completionTokens).toBe(1);
		expect(logTree[0].children[0].children.length).toBe(1);

		expect(logTree[0].children[0].children[0].id).toBe('test-wf-id:test-node-id-c:0:0:0');
		expect(logTree[0].children[0].children[0].runIndex).toBe(0);
		expect(logTree[0].children[0].children[0].parent?.node.name).toBe('B');
		expect(logTree[0].children[0].children[0].consumedTokens.isEstimate).toBe(true);
		expect(logTree[0].children[0].children[0].consumedTokens.completionTokens).toBe(7);

		expect(logTree[0].children[1].id).toBe('test-wf-id:test-node-id-b:0:1');
		expect(logTree[0].children[1].runIndex).toBe(1);
		expect(logTree[0].children[1].parent?.node.name).toBe('A');
		expect(logTree[0].children[1].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[1].consumedTokens.completionTokens).toBe(4);
		expect(logTree[0].children[1].children.length).toBe(1);

		expect(logTree[0].children[1].children[0].id).toBe('test-wf-id:test-node-id-c:0:1:1');
		expect(logTree[0].children[1].children[0].runIndex).toBe(1);
		expect(logTree[0].children[1].children[0].parent?.node.name).toBe('B');
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
		assertNodeTree(rootNode1Tree);
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
		assertNodeTree(rootNode2Tree);
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
		assertNodeTree(rootNode1Tree);
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
		assertNodeTree(rootNode2Tree);
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
		assertNodeTree(rootNodeTree);
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
		assertNodeTree(rootNodeTree);
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
		assertNodeTree(rootNodeTree);

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
		assertNodeTree(rootNode1Tree);
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
		assertNodeTree(rootNode2Tree);
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
		assertNodeTree(rootNode1Tree);
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
		assertNodeTree(rootNode2Tree);

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
		assertNodeTree(rootNode1Tree);
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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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
		assertNodeTree(logs);

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

describe('createLogTree with canvas groups', () => {
	const group = { id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] };

	function expectGroup(entry: LogEntry): GroupLogEntry {
		if (!isGroupLog(entry)) {
			throw new Error('expected a group log entry');
		}
		return entry;
	}

	function expectNode(entry: LogEntry): NodeLogEntry {
		if (!isNodeLog(entry)) {
			throw new Error('expected a node log entry');
		}
		return entry;
	}

	// Linear main flow A -> B -> C -> D, with B and C optionally grouped.
	function createLinearWorkflow(nodeIds: Record<string, string> = {}) {
		return createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: nodeIds.A ?? 'A', name: 'A' }),
				createTestNode({ id: nodeIds.B ?? 'B', name: 'B' }),
				createTestNode({ id: nodeIds.C ?? 'C', name: 'C' }),
				createTestNode({ id: nodeIds.D ?? 'D', name: 'D' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
	}

	function taskAt(seconds: number, partial: Partial<ReturnType<typeof createTestTaskData>> = {}) {
		return createTestTaskData({
			startTime: Date.parse('2025-01-01T00:00:00.000Z') + seconds * 1000,
			executionIndex: seconds,
			...partial,
		});
	}

	function linearResponse() {
		return createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [taskAt(1, { source: [{ previousNode: 'A', previousNodeRun: 0 }] })],
						C: [taskAt(2, { source: [{ previousNode: 'B', previousNodeRun: 0 }] })],
						D: [taskAt(3, { source: [{ previousNode: 'C', previousNodeRun: 0 }] })],
					},
				},
			}),
		});
	}

	it('sums member tokens once for a group', () => {
		const withTokens = (total: number) => ({
			data: {
				main: [
					[{ json: { tokenUsage: { completionTokens: 0, promptTokens: 0, totalTokens: total } } }],
				],
			},
		});
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [taskAt(1, withTokens(10))],
						C: [taskAt(2, withTokens(5))],
					},
				},
			}),
		});

		const logs = createLogTree(createLinearWorkflow(), response, {}, {}, undefined, [group]);
		const groupEntry = expectGroup(logs[1]);

		expect(getSubtreeTotalConsumedTokens(groupEntry, false).totalTokens).toBe(15);
	});

	it('sums member execution time and takes the first start time', () => {
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [taskAt(2, { executionTime: 30 })],
						C: [taskAt(1, { executionTime: 12 })],
					},
				},
			}),
		});

		const logs = createLogTree(createLinearWorkflow(), response, {}, {}, undefined, [group]);
		const groupEntry = expectGroup(logs[1]);

		expect(getGroupTiming(groupEntry)).toEqual({
			startTime: Date.parse('2025-01-01T00:00:01.000Z'), // earliest member (C)
			executionTime: 42,
		});
	});

	it('counts elapsed time for a running member when now is provided', () => {
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [taskAt(1, { executionTime: 12 })],
						C: [taskAt(2, { executionStatus: 'running', executionTime: 0 })],
					},
				},
			}),
		});

		const logs = createLogTree(createLinearWorkflow(), response, {}, {}, undefined, [group]);
		const groupEntry = expectGroup(logs[1]);
		const now = Date.parse('2025-01-01T00:00:05.000Z'); // 3s after C started

		// settled member B (12ms) + running member C elapsed (3000ms)
		expect(getGroupTiming(groupEntry, now)).toEqual({
			startTime: Date.parse('2025-01-01T00:00:01.000Z'),
			executionTime: 3012,
		});
	});

	it('returns undefined group timing when no member has run data', () => {
		const groupEntry = expectGroup(
			createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [group])[1],
		);
		groupEntry.children = [];

		expect(getGroupTiming(groupEntry)).toBeUndefined();
	});

	describe('getGroupExecutionStatus', () => {
		function groupWithMemberStatuses(
			bStatus: ITaskData['executionStatus'],
			cStatus: ITaskData['executionStatus'],
		) {
			const response = createTestWorkflowExecutionResponse({
				id: 'e1',
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [taskAt(0)],
							B: [taskAt(1, { executionStatus: bStatus })],
							C: [taskAt(2, { executionStatus: cStatus })],
						},
					},
				}),
			});

			return expectGroup(
				createLogTree(createLinearWorkflow(), response, {}, {}, undefined, [group])[1],
			);
		}

		it('reports success when all members succeeded', () => {
			expect(getGroupExecutionStatus(groupWithMemberStatuses('success', 'success'))).toBe(
				'success',
			);
		});

		it('reflects a running member over settled ones', () => {
			expect(getGroupExecutionStatus(groupWithMemberStatuses('success', 'running'))).toBe(
				'running',
			);
		});

		it('reflects a waiting member', () => {
			expect(getGroupExecutionStatus(groupWithMemberStatuses('waiting', 'success'))).toBe(
				'waiting',
			);
		});

		it('reflects an errored member', () => {
			expect(getGroupExecutionStatus(groupWithMemberStatuses('success', 'error'))).toBe('error');
		});

		// Folded into error like the canvas rollup: crashed carries no error object but must not read as success
		it('folds a crashed member into error', () => {
			const group = groupWithMemberStatuses('success', 'crashed');
			expect(getGroupExecutionStatus(group)).toBe('error');
			expect(group.hasError).toBe(true);
		});

		// A wholly canceled group has no dominant status and must not read as success
		it('does not report success for a fully canceled group', () => {
			expect(
				getGroupExecutionStatus(groupWithMemberStatuses('canceled', 'canceled')),
			).toBeUndefined();
		});
	});

	// Grouped nodes must stay main-flow nodes: a false sub-node match makes their input pane show their own output
	it('does not treat grouped member nodes as sub-nodes', () => {
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			group,
		]);
		const groupEntry = expectGroup(logs[1]);

		expect(isSubNodeLog(groupEntry.children[0])).toBe(false); // B
		expect(isSubNodeLog(groupEntry.children[1])).toBe(false); // C
	});

	it('does not fold when no node groups are provided', () => {
		const logs = createLogTree(createLinearWorkflow(), linearResponse());

		expect(logs.map((e) => e.type)).toEqual(['node', 'node', 'node', 'node']);
	});

	it('folds contiguous grouped nodes into a single group segment', () => {
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			group,
		]);

		expect(logs).toHaveLength(3); // A, group(B, C), D
		expect(expectNode(logs[0]).node.name).toBe('A');

		const groupEntry = expectGroup(logs[1]);
		expect(groupEntry.group.id).toBe('group-1');
		expect(groupEntry.segmentIndex).toBe(0);
		expect(groupEntry.children.map((c) => expectNode(c).node.name)).toEqual(['B', 'C']);
		expect(groupEntry.children.every((c) => c.parent === groupEntry)).toBe(true);

		expect(expectNode(logs[2]).node.name).toBe('D');
	});

	it('folds a sub-workflow using its own canvas groups', () => {
		const rootWorkflow = createTestWorkflowObject({
			id: 'root-workflow-id',
			nodes: [createTestNode({ id: 'A', name: 'A' })],
		});
		const subWorkflow = createTestWorkflowObject({
			id: 'sub-workflow-id',
			nodes: [createTestNode({ id: 'S1', name: 'S1' }), createTestNode({ id: 'S2', name: 'S2' })],
			connections: {
				S1: { main: [[{ node: 'S2', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const rootResponse = createTestWorkflowExecutionResponse({
			id: 'root-exec-id',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [
							taskAt(0, {
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
					S1: [taskAt(1)],
					S2: [taskAt(2, { source: [{ previousNode: 'S1', previousNodeRun: 0 }] })],
				},
			},
		});

		const logs = createLogTree(
			rootWorkflow,
			rootResponse,
			{ 'sub-workflow-id': subWorkflow },
			{ 'sub-exec-id': subExecutionData },
			undefined,
			[], // no groups on the root workflow
			{ 'sub-workflow-id': [{ id: 'sub-group', name: 'Sub Group', nodeIds: ['S1', 'S2'] }] },
		);

		// A (root) -> its sub-execution children fold into a single group row
		expect(expectNode(logs[0]).node.name).toBe('A');
		const subGroup = expectGroup(logs[0].children[0]);
		expect(subGroup.group.id).toBe('sub-group');
		expect(subGroup.executionId).toBe('sub-exec-id');
		expect(subGroup.children.map((c) => expectNode(c).node.name)).toEqual(['S1', 'S2']);
	});

	it('gives repeated sub-executions of the same group distinct ids', () => {
		// The same sub-workflow (with its own group) is called twice; each fold must get a unique
		// id so collapsing/selecting one sub-execution's group doesn't affect the other.
		const rootWorkflow = createTestWorkflowObject({
			id: 'root-workflow-id',
			nodes: [createTestNode({ id: 'A', name: 'A' })],
		});
		const subWorkflow = createTestWorkflowObject({
			id: 'sub-workflow-id',
			nodes: [createTestNode({ id: 'S1', name: 'S1' }), createTestNode({ id: 'S2', name: 'S2' })],
			connections: {
				S1: { main: [[{ node: 'S2', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const rootResponse = createTestWorkflowExecutionResponse({
			id: 'root-exec-id',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [
							taskAt(0, {
								metadata: {
									subExecution: { workflowId: 'sub-workflow-id', executionId: 'sub-exec-0' },
								},
							}),
							taskAt(1, {
								metadata: {
									subExecution: { workflowId: 'sub-workflow-id', executionId: 'sub-exec-1' },
								},
							}),
						],
					},
				},
			}),
		});
		const subExecutionData = () =>
			createRunExecutionData({
				resultData: {
					runData: {
						S1: [taskAt(1)],
						S2: [taskAt(2, { source: [{ previousNode: 'S1', previousNodeRun: 0 }] })],
					},
				},
			});

		const logs = createLogTree(
			rootWorkflow,
			rootResponse,
			{ 'sub-workflow-id': subWorkflow },
			{ 'sub-exec-0': subExecutionData(), 'sub-exec-1': subExecutionData() },
			undefined,
			[],
			{ 'sub-workflow-id': [{ id: 'sub-group', name: 'Sub Group', nodeIds: ['S1', 'S2'] }] },
		);

		const firstGroup = expectGroup(logs[0].children[0]);
		const secondGroup = expectGroup(logs[1].children[0]);
		expect(firstGroup.group.id).toBe('sub-group');
		expect(secondGroup.group.id).toBe('sub-group');
		expect(firstGroup.id).not.toBe(secondGroup.id);
	});

	it('wraps a single executed member in a group row', () => {
		const singleMemberGroup = { id: 'g-single', name: 'Solo', nodeIds: ['B'] };
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			singleMemberGroup,
		]);

		const groupEntry = expectGroup(logs[1]);
		expect(groupEntry.children.map((c) => expectNode(c).node.name)).toEqual(['B']);
	});

	it('splits a group into multiple segments when interrupted by an ungrouped node', () => {
		// Group A and C; B (ungrouped) runs between them -> two separate segments
		const splitGroup = { id: 'g-split', name: 'Split', nodeIds: ['A', 'C'] };
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			splitGroup,
		]);

		// group(A), B, group(C), D
		expect(logs).toHaveLength(4);

		const first = expectGroup(logs[0]);
		const second = expectGroup(logs[2]);

		expect(first.group.id).toBe('g-split');
		expect(first.segmentIndex).toBe(0);
		expect(first.children.map((c) => expectNode(c).node.name)).toEqual(['A']);

		expect(expectNode(logs[1]).node.name).toBe('B');

		expect(second.group.id).toBe('g-split');
		expect(second.segmentIndex).toBe(1);
		expect(second.children.map((c) => expectNode(c).node.name)).toEqual(['C']);

		expect(expectNode(logs[3]).node.name).toBe('D');
	});

	it('keeps AI sub-nodes nested under their grouped member', () => {
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'Model', name: 'Model' }),
			],
			connections: {
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'A', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
		});
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						Model: [taskAt(1, { source: [{ previousNode: 'A', previousNodeRun: 0 }] })],
					},
				},
			}),
		});
		const aiGroup = { id: 'g-ai', name: 'AI', nodeIds: ['A'] };

		const logs = createLogTree(workflow, response, {}, {}, undefined, [aiGroup]);

		const groupEntry = expectGroup(logs[0]);
		const member = expectNode(groupEntry.children[0]);
		expect(member.node.name).toBe('A');
		expect(member.children.map((c) => expectNode(c).node.name)).toEqual(['Model']);
	});

	it('derives boundary input and output from the nodes crossing the group edge', () => {
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			group,
		]);
		const groupEntry = expectGroup(logs[1]);

		// B is fed from A (outside) -> input boundary; C feeds D (outside) -> output boundary
		expect(groupEntry.boundaries.inputs.map((b) => b.label)).toEqual(['B']);
		expect(groupEntry.boundaries.outputs.map((b) => b.label)).toEqual(['C']);
		expect(groupEntry.boundaries.inputs[0].entry.node.name).toBe('B');
	});

	it('exposes multiple boundary crossings for selection', () => {
		// A fans out to both B and C; B and C each leave the group to D and E
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'B', name: 'B' }),
				createTestNode({ id: 'C', name: 'C' }),
				createTestNode({ id: 'D', name: 'D' }),
				createTestNode({ id: 'E', name: 'E' }),
			],
			connections: {
				A: {
					main: [
						[
							{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
				B: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'E', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [taskAt(1, { source: [{ previousNode: 'A', previousNodeRun: 0 }] })],
						C: [taskAt(2, { source: [{ previousNode: 'A', previousNodeRun: 0 }] })],
						D: [taskAt(3, { source: [{ previousNode: 'B', previousNodeRun: 0 }] })],
						E: [taskAt(4, { source: [{ previousNode: 'C', previousNodeRun: 0 }] })],
					},
				},
			}),
		});

		const logs = createLogTree(workflow, response, {}, {}, undefined, [group]);
		const groupEntry = expectGroup(logs[1]);

		expect(groupEntry.boundaries.inputs.map((b) => b.label)).toEqual(['B', 'C']);
		expect(groupEntry.boundaries.outputs.map((b) => b.label)).toEqual(['B', 'C']);
	});

	it('uses the last run of a looped member for its output boundary', () => {
		// Member B runs twice and feeds outside node D. The group-leaving output must reflect
		// B's final run (a loop's "done" data lands on the last run), while its input stays on the first.
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'B', name: 'B' }),
				createTestNode({ id: 'D', name: 'D' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [taskAt(0)],
						B: [
							taskAt(1, { source: [{ previousNode: 'A', previousNodeRun: 0 }] }),
							taskAt(2, { source: [{ previousNode: 'A', previousNodeRun: 0 }] }),
						],
						D: [taskAt(3, { source: [{ previousNode: 'B', previousNodeRun: 1 }] })],
					},
				},
			}),
		});

		const logs = createLogTree(workflow, response, {}, {}, undefined, [
			{ id: 'g', name: 'G', nodeIds: ['B'] },
		]);
		const groupEntry = expectGroup(logs[1]);

		expect(groupEntry.boundaries.outputs).toHaveLength(1);
		expect(groupEntry.boundaries.outputs[0].entry.runIndex).toBe(1); // last run
		expect(groupEntry.boundaries.inputs[0].entry.runIndex).toBe(0); // first run
	});

	it('exposes one input per crossing when multiple connections enter the same member', () => {
		// External "If"-like node feeds both of its outputs into the single member B
		const workflow = createTestWorkflowObject({
			id: 'w1',
			nodes: [createTestNode({ id: 'X', name: 'X' }), createTestNode({ id: 'B', name: 'B' })],
			connections: {
				X: {
					main: [
						[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			},
		});
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						X: [taskAt(0)],
						B: [
							taskAt(1, {
								source: [
									{ previousNode: 'X', previousNodeOutput: 0 },
									{ previousNode: 'X', previousNodeOutput: 1 },
								],
							}),
						],
					},
				},
			}),
		});

		const logs = createLogTree(workflow, response, {}, {}, undefined, [
			{ id: 'g', name: 'G', nodeIds: ['B'] },
		]);
		const groupEntry = expectGroup(logs[1]);

		// Two distinct crossings into B → selector with two entries, scoped per source index
		expect(groupEntry.boundaries.inputs).toHaveLength(2);
		expect(groupEntry.boundaries.inputs.map((b) => b.sourceIndex)).toEqual([0, 1]);
		expect(groupEntry.boundaries.inputs.map((b) => b.label)).toEqual(['B', 'B (2)']);
	});

	it('treats a trigger member with no source as a boundary input', () => {
		const triggerGroup = { id: 'g-trigger', name: 'Trigger group', nodeIds: ['A', 'B'] };
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			triggerGroup,
		]);
		const groupEntry = expectGroup(logs[0]);

		// A has no source -> input boundary; B feeds C (outside) -> output boundary
		expect(groupEntry.boundaries.inputs.map((b) => b.label)).toContain('A');
		expect(groupEntry.boundaries.outputs.map((b) => b.label)).toContain('B');
	});

	it('falls back to first and last member when no edge crossing is detected', () => {
		// Whole workflow is one group: nothing enters or leaves except the implicit ends
		const wholeGroup = { id: 'g-all', name: 'All', nodeIds: ['A', 'B', 'C', 'D'] };
		const logs = createLogTree(createLinearWorkflow(), linearResponse(), {}, {}, undefined, [
			wholeGroup,
		]);
		const groupEntry = expectGroup(logs[0]);

		// A has no source -> still an input; D has no outgoing main child -> still an output
		expect(groupEntry.boundaries.inputs[0].label).toBe('A');
		expect(groupEntry.boundaries.outputs.at(-1)?.label).toBe('D');
	});
});

describe(getDefaultCollapsedEntries, () => {
	const group = { id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] };

	function groupedWorkflow() {
		return createTestWorkflowObject({
			id: 'w1',
			nodes: [
				createTestNode({ id: 'A', name: 'A' }),
				createTestNode({ id: 'B', name: 'B' }),
				createTestNode({ id: 'C', name: 'C' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});
	}

	it('collapses group entries by default', () => {
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData({ startTime: 1 })],
						C: [createTestTaskData({ startTime: 2 })],
					},
				},
			}),
		});
		const logs = createLogTree(groupedWorkflow(), response, {}, {}, undefined, [group]);
		const groupEntry = logs.find(isGroupLog);

		expect(groupEntry).toBeDefined();
		expect(getDefaultCollapsedEntries(logs)[groupEntry!.id]).toBe(true);
	});

	it('keeps a group expanded when a descendant errored', () => {
		const response = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData({ startTime: 1 })],
						C: [
							createTestTaskData({
								startTime: 2,
								executionStatus: 'error',
								error: { message: 'boom' } as unknown as ExecutionError,
							}),
						],
					},
				},
			}),
		});
		const logs = createLogTree(groupedWorkflow(), response, {}, {}, undefined, [group]);
		const groupEntry = logs.find(isGroupLog);

		expect(groupEntry).toBeDefined();
		expect(getDefaultCollapsedEntries(logs)[groupEntry!.id]).toBeUndefined();
	});
});
