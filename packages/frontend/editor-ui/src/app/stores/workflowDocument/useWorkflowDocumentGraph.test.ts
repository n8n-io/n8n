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
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentNodes,
	type WorkflowDocumentNodesDeps,
} from './useWorkflowDocumentNodes';
import { useWorkflowDocumentConnections } from './useWorkflowDocumentConnections';
import { useWorkflowDocumentGraph } from './useWorkflowDocumentGraph';
import { useWorkflowDocumentNodeMetadata } from './useWorkflowDocumentNodeMetadata';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createNodesDeps(): WorkflowDocumentNodesDeps {
	return {
		getNodeType: vi.fn().mockReturnValue(null),
		nodeMetadata: useWorkflowDocumentNodeMetadata(),
	};
}

describe('useWorkflowDocumentGraph', () => {
	let nodes: ReturnType<typeof useWorkflowDocumentNodes>;
	let connections: ReturnType<typeof useWorkflowDocumentConnections>;

	beforeEach(() => {
		setActivePinia(createPinia());
		nodes = useWorkflowDocumentNodes(createNodesDeps());
		connections = useWorkflowDocumentConnections({
			getNodeById: (id) => nodes.getNodeById(id),
		});
	});

	describe('graph traversal', () => {
		it('getParentNodes returns parent names for connected nodes', () => {
			nodes.setNodes([
				createNode({ name: 'A' }),
				createNode({ name: 'B' }),
				createNode({ name: 'C' }),
			]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			const parents = graph.getParentNodes('C');
			expect(parents).toContain('B');
			expect(parents).toContain('A');
		});

		it('getParentNodes returns empty array for root node', () => {
			nodes.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			expect(graph.getParentNodes('A')).toEqual([]);
		});

		it('getParentNodes respects depth limit', () => {
			nodes.setNodes([
				createNode({ name: 'A' }),
				createNode({ name: 'B' }),
				createNode({ name: 'C' }),
			]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			// Depth 1: only direct parents
			const directParents = graph.getParentNodes('C', NodeConnectionTypes.Main, 1);
			expect(directParents).toEqual(['B']);
		});

		it('getChildNodes returns child names for connected nodes', () => {
			nodes.setNodes([
				createNode({ name: 'A' }),
				createNode({ name: 'B' }),
				createNode({ name: 'C' }),
			]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			const children = graph.getChildNodes('A');
			expect(children).toContain('B');
			expect(children).toContain('C');
		});

		it('getChildNodes returns empty array for leaf node', () => {
			nodes.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			expect(graph.getChildNodes('B')).toEqual([]);
		});

		it('getParentNodesByDepth returns nodes with depth info', () => {
			nodes.setNodes([
				createNode({ name: 'A' }),
				createNode({ name: 'B' }),
				createNode({ name: 'C' }),
			]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

			const parents = graph.getParentNodesByDepth('C');
			expect(parents).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'B', depth: 1 }),
					expect.objectContaining({ name: 'A', depth: 2 }),
				]),
			);
		});

		it('getConnectionsBetweenNodes returns connection pairs between source and target sets', () => {
			nodes.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			connections.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const graph = useWorkflowDocumentGraph();

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

	describe('node lookup', () => {
		it('getNodeByNameFromWorkflow returns INode for existing node', () => {
			nodes.setNodes([createNode({ name: 'A' })]);

			const graph = useWorkflowDocumentGraph();

			const result = graph.getNodeByNameFromWorkflow('A');
			expect(result).not.toBeNull();
			expect(result?.name).toBe('A');
			expect(result?.type).toBe('n8n-nodes-base.set');
		});

		it('getNodeByNameFromWorkflow returns null for unknown node', () => {
			const graph = useWorkflowDocumentGraph();

			expect(graph.getNodeByNameFromWorkflow('NonExistent')).toBeNull();
		});

		it('getStartNode returns a start node from the workflow', () => {
			// Single-node workflow — __getStartNode returns early without nodeType lookup
			nodes.setNodes([createNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' })]);

			const graph = useWorkflowDocumentGraph();

			const startNode = graph.getStartNode();
			expect(startNode).toBeDefined();
			expect(startNode?.name).toBe('Trigger');
		});
	});
});
