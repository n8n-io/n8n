import { describe, it, expect } from '@jest/globals';

import { buildCompositeTree } from './composite-builder';
import type {
	LeafNode,
	ChainNode,
	IfElseCompositeNode,
	SplitInBatchesCompositeNode,
} from './composite-tree';
import { annotateGraph } from './graph-annotator';
import { buildSemanticGraph } from './semantic-graph';
import type { WorkflowJSON } from '../types/base';

// Helper to build and annotate graph
function prepareGraph(json: WorkflowJSON) {
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	return graph;
}

describe('composite-builder', () => {
	describe('buildCompositeTree', () => {
		describe('simple workflows', () => {
			it('builds single trigger as leaf', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				expect(tree.roots).toHaveLength(1);
				expect(tree.roots[0].kind).toBe('leaf');
				expect((tree.roots[0] as LeafNode).node.name).toBe('Trigger');
			});

			it('builds linear chain', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Final',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						Process: { main: [[{ node: 'Final', type: 'main', index: 0 }]] },
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				expect(tree.roots).toHaveLength(1);
				expect(tree.roots[0].kind).toBe('chain');
				const chain = tree.roots[0] as ChainNode;
				expect(chain.nodes).toHaveLength(3);
				expect((chain.nodes[0] as LeafNode).node.name).toBe('Trigger');
				expect((chain.nodes[1] as LeafNode).node.name).toBe('Process');
				expect((chain.nodes[2] as LeafNode).node.name).toBe('Final');
			});
		});

		describe('IF branch', () => {
			it('builds ifElse composite', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'FalseHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[{ node: 'FalseHandler', type: 'main', index: 0 }],
							],
						},
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				expect(tree.roots).toHaveLength(1);
				expect(tree.roots[0].kind).toBe('chain');
				const chain = tree.roots[0] as ChainNode;

				// Chain should have: Trigger -> IfElse
				expect(chain.nodes).toHaveLength(2);
				expect((chain.nodes[0] as LeafNode).node.name).toBe('Trigger');
				expect(chain.nodes[1].kind).toBe('ifElse');

				const ifElse = chain.nodes[1] as IfElseCompositeNode;
				expect(ifElse.ifNode.name).toBe('IF');
				expect(ifElse.trueBranch).not.toBeNull();
				expect(ifElse.falseBranch).not.toBeNull();
				expect((ifElse.trueBranch as LeafNode).node.name).toBe('TrueHandler');
				expect((ifElse.falseBranch as LeafNode).node.name).toBe('FalseHandler');
			});

			it('handles IF with only true branch', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[], // false branch empty
							],
						},
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				const chain = tree.roots[0] as ChainNode;
				const ifElse = chain.nodes[1] as IfElseCompositeNode;

				expect(ifElse.trueBranch).not.toBeNull();
				expect(ifElse.falseBranch).toBeNull();
			});
		});

		describe('Merge', () => {
			it('builds merge composite', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Branch1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, -50],
						},
						{
							id: '3',
							name: 'Branch2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 50],
						},
						{
							id: '4',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [200, 0],
							parameters: { numberInputs: 2 },
						},
					],
					connections: {
						Trigger: {
							main: [
								[
									{ node: 'Branch1', type: 'main', index: 0 },
									{ node: 'Branch2', type: 'main', index: 0 },
								],
							],
						},
						Branch1: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
						Branch2: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				// With the new deferred connections approach, merge nodes use .input(n) syntax
				// The merge node should be in the variables and have deferred connections
				expect(tree.variables.has('Merge')).toBe(true);

				// Check that deferred connections are created for both branches
				expect(tree.deferredConnections).toHaveLength(2);

				// Check that Branch1 connects to merge input 0
				const branch1Conn = tree.deferredConnections.find(
					(c) => c.sourceNodeName === 'Branch1' && c.targetInputIndex === 0,
				);
				expect(branch1Conn).toBeDefined();
				expect(branch1Conn?.targetNode.name).toBe('Merge');

				// Check that Branch2 connects to merge input 1
				const branch2Conn = tree.deferredConnections.find(
					(c) => c.sourceNodeName === 'Branch2' && c.targetInputIndex === 1,
				);
				expect(branch2Conn).toBeDefined();
				expect(branch2Conn?.targetNode.name).toBe('Merge');
			});
		});

		describe('SplitInBatches', () => {
			it('builds splitInBatches composite with loop', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'SplitInBatches',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'DoneHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'LoopBody',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
						SplitInBatches: {
							main: [
								[{ node: 'DoneHandler', type: 'main', index: 0 }],
								[{ node: 'LoopBody', type: 'main', index: 0 }],
							],
						},
						LoopBody: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] }, // loop back
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				const chain = tree.roots[0] as ChainNode;

				// Find splitInBatches in the chain
				const sibNode = chain.nodes.find((n) => n.kind === 'splitInBatches');
				expect(sibNode).toBeDefined();

				const sib = sibNode as SplitInBatchesCompositeNode;
				expect(sib.sibNode.name).toBe('SplitInBatches');
				expect(sib.doneChain).not.toBeNull();
				expect(sib.loopChain).not.toBeNull();

				// Loop chain should end with variable reference back to SplitInBatches
				// The loop body connects back, creating a cycle
			});
		});

		describe('cycles and convergence', () => {
			it('creates variable for cycle target', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'SplitInBatches',
							type: 'n8n-nodes-base.splitInBatches',
							typeVersion: 3,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
						SplitInBatches: {
							main: [[], [{ node: 'Process', type: 'main', index: 0 }]],
						},
						Process: { main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]] },
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				// Should have variable for SplitInBatches (cycle target)
				expect(tree.variables.has('SplitInBatches')).toBe(true);
			});

			it('uses variable reference for convergence point', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
						{
							id: '3',
							name: 'TrueHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'FalseHandler',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '5',
							name: 'Common',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[{ node: 'FalseHandler', type: 'main', index: 0 }],
							],
						},
						TrueHandler: { main: [[{ node: 'Common', type: 'main', index: 0 }]] },
						FalseHandler: { main: [[{ node: 'Common', type: 'main', index: 0 }]] },
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				// Should have variable for Common (convergence point)
				expect(tree.variables.has('Common')).toBe(true);
			});
		});

		describe('empty workflow', () => {
			it('handles empty workflow', () => {
				const json: WorkflowJSON = {
					name: 'Empty',
					nodes: [],
					connections: {},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				expect(tree.roots).toHaveLength(0);
				expect(tree.variables.size).toBe(0);
			});
		});

		describe('orphaned nodes', () => {
			it('includes disconnected nodes that are not reachable from any root', () => {
				// Workflow with a trigger chain AND a completely disconnected node
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Disconnected',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 300],
							// No connections at all - truly orphaned
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						// Disconnected has no connections
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				// Should have 2 roots: the main chain AND the disconnected node
				expect(tree.roots).toHaveLength(2);

				// Find all node names in the tree
				const nodeNames: string[] = [];
				function collectNodeNames(node: unknown) {
					if (!node || typeof node !== 'object') return;
					const n = node as { kind?: string; node?: { name: string }; nodes?: unknown[] };
					if (n.kind === 'leaf' && n.node) {
						nodeNames.push(n.node.name);
					} else if (n.kind === 'chain' && n.nodes) {
						n.nodes.forEach(collectNodeNames);
					}
				}
				tree.roots.forEach(collectNodeNames);

				// All 3 nodes should be present
				expect(nodeNames).toContain('Trigger');
				expect(nodeNames).toContain('Process');
				expect(nodeNames).toContain('Disconnected');
			});

			it('includes all nodes in a disconnected component (not just the first node)', () => {
				// Workflow with main trigger chain AND a disconnected component (A -> B)
				// where B has incoming connections but isn't reachable from the main trigger
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: '2',
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'DisconnectedRoot',
							type: 'n8n-nodes-base.noOp', // Not a trigger but no incoming connections
							typeVersion: 1,
							position: [0, 200],
						},
						{
							id: '4',
							name: 'DisconnectedLeaf',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 200],
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						DisconnectedRoot: { main: [[{ node: 'DisconnectedLeaf', type: 'main', index: 0 }]] },
					},
				};

				const graph = prepareGraph(json);
				const tree = buildCompositeTree(graph);

				// Find all node names in the tree
				const nodeNames: string[] = [];
				function collectNodeNames(node: unknown) {
					if (!node || typeof node !== 'object') return;
					const n = node as { kind?: string; node?: { name: string }; nodes?: unknown[] };
					if (n.kind === 'leaf' && n.node) {
						nodeNames.push(n.node.name);
					} else if (n.kind === 'chain' && n.nodes) {
						n.nodes.forEach(collectNodeNames);
					}
				}
				tree.roots.forEach(collectNodeNames);

				// All 4 nodes should be present
				expect(nodeNames).toContain('Trigger');
				expect(nodeNames).toContain('Process');
				expect(nodeNames).toContain('DisconnectedRoot');
				expect(nodeNames).toContain('DisconnectedLeaf');
				expect(nodeNames).toHaveLength(4);
			});
		});
	});
});
