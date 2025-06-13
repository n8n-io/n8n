import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import {
	createLogTree,
	deepToRaw,
	findSelectedLogEntry,
	getDefaultCollapsedEntries,
	getTreeNodeData,
	mergeStartData,
	restoreChatHistory,
} from './logs.utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	type ExecutionError,
	type ITaskStartedData,
} from 'n8n-workflow';
import { createTestLogTreeCreationContext } from './__test__/data';
import type { LogEntrySelection } from './logs.types';
import type { IExecutionResponse } from '@/Interface';
import { isReactive, reactive } from 'vue';
import { createTestLogEntry } from './__test__/mocks';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE } from '@/constants';

describe(getTreeNodeData, () => {
	it('should generate one node per execution', () => {
		const workflow = createTestWorkflowObject({
			id: 'test-wf-id',
			nodes: [
				createTestNode({ name: 'A', id: 'test-node-id-a' }),
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
		const logTree = getTreeNodeData('A', ctx.data.resultData.runData.A[0], undefined, ctx);

		expect(logTree.length).toBe(1);

		expect(logTree[0].id).toBe('test-wf-id:A:test-execution-id:0');
		expect(logTree[0].depth).toBe(0);
		expect(logTree[0].runIndex).toBe(0);
		expect(logTree[0].parent).toBe(undefined);
		expect(logTree[0].runData.startTime).toBe(1740528000000);
		expect(logTree[0].children.length).toBe(2);

		expect(logTree[0].children[0].id).toBe('test-wf-id:B:test-execution-id:0');
		expect(logTree[0].children[0].depth).toBe(1);
		expect(logTree[0].children[0].runIndex).toBe(0);
		expect(logTree[0].children[0].parent?.node.name).toBe('A');
		expect(logTree[0].children[0].runData.startTime).toBe(1740528000001);
		expect(logTree[0].children[0].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[0].consumedTokens.completionTokens).toBe(1);
		expect(logTree[0].children[0].children.length).toBe(1);

		expect(logTree[0].children[0].children[0].id).toBe('test-wf-id:C:test-execution-id:0');
		expect(logTree[0].children[0].children[0].depth).toBe(2);
		expect(logTree[0].children[0].children[0].runIndex).toBe(0);
		expect(logTree[0].children[0].children[0].parent?.node.name).toBe('B');
		expect(logTree[0].children[0].children[0].consumedTokens.isEstimate).toBe(true);
		expect(logTree[0].children[0].children[0].consumedTokens.completionTokens).toBe(7);

		expect(logTree[0].children[1].id).toBe('test-wf-id:B:test-execution-id:1');
		expect(logTree[0].children[1].depth).toBe(1);
		expect(logTree[0].children[1].runIndex).toBe(1);
		expect(logTree[0].children[1].parent?.node.name).toBe('A');
		expect(logTree[0].children[1].consumedTokens.isEstimate).toBe(false);
		expect(logTree[0].children[1].consumedTokens.completionTokens).toBe(4);
		expect(logTree[0].children[1].children.length).toBe(1);

		expect(logTree[0].children[1].children[0].id).toBe('test-wf-id:C:test-execution-id:1');
		expect(logTree[0].children[1].children[0].depth).toBe(2);
		expect(logTree[0].children[1].children[0].runIndex).toBe(1);
		expect(logTree[0].children[1].children[0].parent?.node.name).toBe('B');
		expect(logTree[0].children[1].children[0].consumedTokens.completionTokens).toBe(0);
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
		const rootNode1Tree = getTreeNodeData(
			'RootNode1',
			runData.RootNode1[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SharedSubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for RootNode2 - should only show SharedSubNode with source RootNode2
		const rootNode2Tree = getTreeNodeData(
			'RootNode2',
			runData.RootNode2[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
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
		const rootNode1Tree = getTreeNodeData(
			'RootNode',
			runData.RootNode[0],
			0,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode1Tree[0].children.length).toBe(1);
		expect(rootNode1Tree[0].children[0].node.name).toBe('SubNode');
		expect(rootNode1Tree[0].children[0].runIndex).toBe(0);

		// Test for run #2 of RootNode - should only show SubNode with source run index 1
		const rootNode2Tree = getTreeNodeData(
			'RootNode',
			runData.RootNode[1],
			1,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNode2Tree[0].children.length).toBe(1);
		expect(rootNode2Tree[0].children[0].node.name).toBe('SubNode');
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
			'RootNode',
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
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
			'RootNode',
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);
		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
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

		// Create test run data with source information
		const runData = {
			RootNode: [createTestTaskData({ executionIndex: 0 })],
			SubNode: [createTestTaskData({ executionIndex: 1, source: [null] })],
		};

		const rootNodeTree = getTreeNodeData(
			'RootNode',
			runData.RootNode[0],
			undefined,
			createTestLogTreeCreationContext(workflow, runData),
		);

		expect(rootNodeTree[0].children.length).toBe(1);
		expect(rootNodeTree[0].children[0].node.name).toBe('SubNode');
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
		const rootNode1Tree = getTreeNodeData(
			'RootNode1',
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
			'RootNode2',
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
		const rootNode1Tree = getTreeNodeData(
			'RootNode1',
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
			'RootNode2',
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
});

describe(findSelectedLogEntry, () => {
	function find(state: LogEntrySelection, response: IExecutionResponse) {
		return findSelectedLogEntry(
			state,
			createLogTree(createTestWorkflowObject(response.workflowData), response),
		);
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
			const response = createTestWorkflowExecutionResponse({
				id: 'my-exec-id',
				workflowData: createTestWorkflow({
					id: 'test-wf-id',
					nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B' })],
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

			const result = find({ type: 'selected', id: 'test-wf-id:A:my-exec-id:0' }, response);

			expect(result).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
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
			data: {
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
			},
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
					data: {
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
					},
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
			data: {
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData()],
					},
				},
			},
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
			data: {
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
			},
		});
		const subExecutionData = {
			resultData: { runData: { C: [createTestTaskData(), createTestTaskData()] } },
		};
		const logs = createLogTree(
			workflow,
			rootExecutionData,
			{ 'sub-workflow-id': subWorkflow },
			{ 'sub-exec-id': subExecutionData },
		);

		expect(logs).toHaveLength(2);

		expect(logs[0].node.name).toBe('A');
		expect(logs[0].depth).toBe(0);
		expect(logs[0].workflow).toBe(workflow);
		expect(logs[0].execution).toBe(rootExecutionData.data);
		expect(logs[0].executionId).toBe('root-exec-id');
		expect(logs[0].children).toHaveLength(0);

		expect(logs[1].node.name).toBe('B');
		expect(logs[1].depth).toBe(0);
		expect(logs[1].workflow).toBe(workflow);
		expect(logs[1].execution).toBe(rootExecutionData.data);
		expect(logs[1].executionId).toBe('root-exec-id');
		expect(logs[1].children).toHaveLength(2);

		expect(logs[1].children[0].node.name).toBe('C');
		expect(logs[1].children[0].depth).toBe(1);
		expect(logs[1].children[0].workflow).toBe(subWorkflow);
		expect(logs[1].children[0].execution).toBe(subExecutionData);
		expect(logs[1].children[0].executionId).toBe('sub-exec-id');
		expect(logs[1].children[0].children).toHaveLength(0);

		expect(logs[1].children[1].node.name).toBe('C');
		expect(logs[1].children[1].depth).toBe(1);
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
			data: {
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
			},
		});
		const subExecutionData = {
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
		};
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

describe(mergeStartData, () => {
	it('should return unchanged execution response if start data is empty', () => {
		const response = createTestWorkflowExecutionResponse({
			data: {
				resultData: {
					runData: {
						A: [createTestTaskData()],
						B: [createTestTaskData(), createTestTaskData()],
					},
				},
			},
		});

		expect(mergeStartData({}, response)).toEqual(response);
	});

	it('should add runs in start data to the execution response as running state', () => {
		const response = createTestWorkflowExecutionResponse({
			data: {
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
						B: [
							createTestTaskData({ startTime: 1, executionIndex: 1 }),
							createTestTaskData({ startTime: 2, executionIndex: 2 }),
						],
					},
				},
			},
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
			data: {
				resultData: {
					runData: {
						A: [createTestTaskData({ executionIndex: 0 })],
					},
				},
			},
		});
		const startData = {
			A: [createTestTaskData({ executionIndex: 0 })],
		};
		const merged = mergeStartData(startData, response);

		expect(merged.data?.resultData.runData.A).toEqual(response.data?.resultData.runData.A);
	});

	it('should not add runs in start data if a run for the same node with larger start time already exists in response', () => {
		const response = createTestWorkflowExecutionResponse({
			data: {
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
					},
				},
			},
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
				data: {
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
				},
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
