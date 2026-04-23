/**
 * Integration tests for useWorkflowDocumentGraph.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the public API. This "round-trip" pattern (write → read back →
 * assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the internals change (e.g. owning
 *    its own refs instead of delegating), these tests stay unchanged because
 *    they only exercise the public contract.
 *  - Delegation-style tests (expect(store.method).toHaveBeenCalled()) would
 *    need to be rewritten every time internals change; round-trips do not.
 *
 * Data is seeded through the sibling nodes/connections composables (not
 * workflowsStore directly) so these tests survive Phase 2 when workflowsStore
 * is removed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { CHAT_TRIGGER_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections, INodeTypes } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentNodes,
	type WorkflowDocumentNodesDeps,
} from './useWorkflowDocumentNodes';
import { useWorkflowDocumentConnections } from './useWorkflowDocumentConnections';
import { useWorkflowDocumentGraph } from './useWorkflowDocumentGraph';
import { useWorkflowDocumentWorkflowObject } from './useWorkflowDocumentWorkflowObject';
import { useWorkflowDocumentNodeMetadata } from './useWorkflowDocumentNodeMetadata';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createNodesDeps(): WorkflowDocumentNodesDeps {
	return {
		getNodeType: vi.fn().mockReturnValue(null),
		assignNodeId: vi.fn().mockReturnValue(''),
		syncWorkflowObject: vi.fn(),
		unpinNodeData: vi.fn(),
		nodeMetadata: useWorkflowDocumentNodeMetadata(),
	};
}

function createMockNodeTypes(): INodeTypes {
	return {
		getByName: vi.fn(),
		getByNameAndVersion: vi.fn(),
		getKnownTypes: vi.fn().mockReturnValue({}),
	};
}

describe('useWorkflowDocumentGraph', () => {
	let nodes: ReturnType<typeof useWorkflowDocumentNodes>;
	let connections: ReturnType<typeof useWorkflowDocumentConnections>;
	let workflowObj: ReturnType<typeof useWorkflowDocumentWorkflowObject>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		nodes = useWorkflowDocumentNodes(createNodesDeps());
		connections = useWorkflowDocumentConnections({
			getNodeById: (id) => nodes.getNodeById(id),
			syncWorkflowObject: vi.fn(),
		});
		workflowObj = useWorkflowDocumentWorkflowObject({
			workflowId: '',
			getNodeTypes: () => createMockNodeTypes(),
		});
	});

	function seedAndCreateGraph(
		nodeList: INodeUi[],
		connectionMap: IConnections = {},
	): ReturnType<typeof useWorkflowDocumentGraph> {
		nodes.setNodes(nodeList);
		connections.setConnections(connectionMap);
		workflowObj.syncWorkflowObjectNodes(workflowsStore.workflow.nodes);
		workflowObj.syncWorkflowObjectConnections(workflowsStore.workflow.connections);
		return useWorkflowDocumentGraph(workflowObj.workflowObject);
	}

	describe('graph traversal', () => {
		it('getParentNodes returns parent names for connected nodes', () => {
			const graph = seedAndCreateGraph(
				[createNode({ name: 'A' }), createNode({ name: 'B' }), createNode({ name: 'C' })],
				{
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
					B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			);

			const parents = graph.getParentNodes('C');
			expect(parents).toContain('B');
			expect(parents).toContain('A');
		});

		it('getParentNodes returns empty array for root node', () => {
			const graph = seedAndCreateGraph([createNode({ name: 'A' }), createNode({ name: 'B' })], {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(graph.getParentNodes('A')).toEqual([]);
		});

		it('getParentNodes respects depth limit', () => {
			const graph = seedAndCreateGraph(
				[createNode({ name: 'A' }), createNode({ name: 'B' }), createNode({ name: 'C' })],
				{
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
					B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			);

			const directParents = graph.getParentNodes('C', NodeConnectionTypes.Main, 1);
			expect(directParents).toEqual(['B']);
		});

		it('getChildNodes returns child names for connected nodes', () => {
			const graph = seedAndCreateGraph(
				[createNode({ name: 'A' }), createNode({ name: 'B' }), createNode({ name: 'C' })],
				{
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
					B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			);

			const children = graph.getChildNodes('A');
			expect(children).toContain('B');
			expect(children).toContain('C');
		});

		it('getChildNodes returns empty array for leaf node', () => {
			const graph = seedAndCreateGraph([createNode({ name: 'A' }), createNode({ name: 'B' })], {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(graph.getChildNodes('B')).toEqual([]);
		});

		it('getParentNodesByDepth returns nodes with depth info', () => {
			const graph = seedAndCreateGraph(
				[createNode({ name: 'A' }), createNode({ name: 'B' }), createNode({ name: 'C' })],
				{
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
					B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			);

			const parents = graph.getParentNodesByDepth('C');
			expect(parents).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'B', depth: 1 }),
					expect.objectContaining({ name: 'A', depth: 2 }),
				]),
			);
		});

		it('getConnectionsBetweenNodes returns connection pairs between source and target sets', () => {
			const graph = seedAndCreateGraph([createNode({ name: 'A' }), createNode({ name: 'B' })], {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const result = graph.getConnectionsBetweenNodes(['A'], ['B']);
			expect(result).toHaveLength(1);
			expect(result[0][0]).toEqual(
				expect.objectContaining({ node: 'A', type: NodeConnectionTypes.Main }),
			);
			expect(result[0][1]).toEqual(
				expect.objectContaining({ node: 'B', type: NodeConnectionTypes.Main }),
			);
		});
	});

	describe('findRootWithMainConnection', () => {
		it('returns child connected via ai tool when it also has a main parent', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'ToolNode' }),
					createNode({ name: 'UpstreamNode' }),
					createNode({ name: 'RootNode' }),
				],
				{
					ToolNode: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: 'RootNode', type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
					UpstreamNode: {
						main: [[{ node: 'RootNode', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			);

			expect(graph.findRootWithMainConnection('ToolNode')).toBe('RootNode');
		});

		it('finds the root for a deeply nested vector tool chain', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'EmbeddingsNode' }),
					createNode({ name: 'VectorStoreNode' }),
					createNode({ name: 'VectorToolNode' }),
					createNode({ name: 'AI Agent' }),
					createNode({ name: 'SetNode' }),
				],
				{
					EmbeddingsNode: {
						[NodeConnectionTypes.AiEmbedding]: [
							[
								{
									node: 'VectorStoreNode',
									type: NodeConnectionTypes.AiEmbedding,
									index: 0,
								},
							],
						],
					},
					VectorStoreNode: {
						[NodeConnectionTypes.AiVectorStore]: [
							[
								{
									node: 'VectorToolNode',
									type: NodeConnectionTypes.AiVectorStore,
									index: 0,
								},
							],
						],
					},
					VectorToolNode: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: 'AI Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
					SetNode: {
						main: [[{ node: 'AI Agent', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			);

			expect(graph.findRootWithMainConnection('EmbeddingsNode')).toBe('AI Agent');
		});

		it('returns null when no child has a main input connection', () => {
			const graph = seedAndCreateGraph(
				[createNode({ name: 'ParentNode' }), createNode({ name: 'AiChild' })],
				{
					ParentNode: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: 'AiChild', type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				},
			);

			expect(graph.findRootWithMainConnection('ParentNode')).toBeNull();
		});
	});

	describe('checkIfNodeHasChatParent', () => {
		it('returns true when node has a Chat Trigger in its main-connection ancestry', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'Chat Trigger', type: CHAT_TRIGGER_NODE_TYPE }),
					createNode({ name: 'Agent' }),
				],
				{
					'Chat Trigger': {
						main: [[{ node: 'Agent', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			);

			expect(graph.checkIfNodeHasChatParent('Agent')).toBe(true);
		});

		it('returns false when node has no Chat Trigger parent', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					createNode({ name: 'Agent' }),
				],
				{
					'Manual Trigger': {
						main: [[{ node: 'Agent', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			);

			expect(graph.checkIfNodeHasChatParent('Agent')).toBe(false);
		});
	});

	describe('checkIfToolNodeHasChatParent', () => {
		it('returns true when tool node is connected via ai_tool to an agent that has a Chat Trigger parent', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'Chat Trigger', type: CHAT_TRIGGER_NODE_TYPE }),
					createNode({ name: 'AI Agent' }),
					createNode({ name: 'My Tool' }),
				],
				{
					'Chat Trigger': {
						main: [[{ node: 'AI Agent', type: NodeConnectionTypes.Main, index: 0 }]],
					},
					'My Tool': {
						[NodeConnectionTypes.AiTool]: [
							[{ node: 'AI Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				},
			);

			expect(graph.checkIfToolNodeHasChatParent('My Tool')).toBe(true);
		});

		it('returns false when tool node is connected to an agent that has no Chat Trigger parent', () => {
			const graph = seedAndCreateGraph(
				[
					createNode({ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					createNode({ name: 'AI Agent' }),
					createNode({ name: 'My Tool' }),
				],
				{
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: NodeConnectionTypes.Main, index: 0 }]],
					},
					'My Tool': {
						[NodeConnectionTypes.AiTool]: [
							[{ node: 'AI Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				},
			);

			expect(graph.checkIfToolNodeHasChatParent('My Tool')).toBe(false);
		});

		it('returns false when tool node has no ai_tool connections', () => {
			const graph = seedAndCreateGraph([createNode({ name: 'My Tool' })]);

			expect(graph.checkIfToolNodeHasChatParent('My Tool')).toBe(false);
		});

		it('returns false for an unknown node name', () => {
			const graph = seedAndCreateGraph([]);

			expect(graph.checkIfToolNodeHasChatParent('NonExistentNode')).toBe(false);
		});
	});

	describe('node lookup', () => {
		it('getNodeByNameFromWorkflow returns INode for existing node', () => {
			const graph = seedAndCreateGraph([createNode({ name: 'A' })]);

			const result = graph.getNodeByNameFromWorkflow('A');
			expect(result).not.toBeNull();
			expect(result?.name).toBe('A');
			expect(result?.type).toBe('n8n-nodes-base.set');
		});

		it('getNodeByNameFromWorkflow returns null for unknown node', () => {
			const graph = seedAndCreateGraph([]);

			expect(graph.getNodeByNameFromWorkflow('NonExistent')).toBeNull();
		});

		it('getStartNode returns a start node from the workflow', () => {
			const graph = seedAndCreateGraph([
				createNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
			]);

			const startNode = graph.getStartNode();
			expect(startNode).toBeDefined();
			expect(startNode?.name).toBe('Trigger');
		});
	});
});
