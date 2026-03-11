import { describe, it, expect } from 'vitest';

import { WorkflowGraph } from '../workflow-graph';
import type { WorkflowGraphData } from '../graph.types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function createLinearGraph(): WorkflowGraphData {
	return {
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'trigger',
				stepFunctionRef: 'step_trigger',
				config: {},
			},
			{ id: 'step1', name: 'Step 1', type: 'step', stepFunctionRef: 'step_1', config: {} },
			{ id: 'step2', name: 'Step 2', type: 'step', stepFunctionRef: 'step_2', config: {} },
		],
		edges: [
			{ from: 'trigger', to: 'step1' },
			{ from: 'step1', to: 'step2' },
		],
	};
}

function createParallelGraph(): WorkflowGraphData {
	return {
		nodes: [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'trigger',
				stepFunctionRef: 'step_trigger',
				config: {},
			},
			{ id: 'a', name: 'Branch A', type: 'step', stepFunctionRef: 'step_a', config: {} },
			{ id: 'b', name: 'Branch B', type: 'step', stepFunctionRef: 'step_b', config: {} },
			{ id: 'merge', name: 'Merge', type: 'step', stepFunctionRef: 'step_merge', config: {} },
		],
		edges: [
			{ from: 'trigger', to: 'a' },
			{ from: 'trigger', to: 'b' },
			{ from: 'a', to: 'merge' },
			{ from: 'b', to: 'merge' },
		],
	};
}

function createConditionalGraph(): WorkflowGraphData {
	return {
		nodes: [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'trigger',
				stepFunctionRef: 'step_trigger',
				config: {},
			},
			{ id: 'check', name: 'Check', type: 'step', stepFunctionRef: 'step_check', config: {} },
			{
				id: 'yes',
				name: 'Yes Branch',
				type: 'step',
				stepFunctionRef: 'step_yes',
				config: {},
			},
			{ id: 'no', name: 'No Branch', type: 'step', stepFunctionRef: 'step_no', config: {} },
		],
		edges: [
			{ from: 'trigger', to: 'check' },
			{ from: 'check', to: 'yes', condition: 'output.value > 10' },
			{ from: 'check', to: 'no', condition: 'output.value <= 10' },
		],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkflowGraph', () => {
	describe('getTriggerNode', () => {
		it('should return the trigger node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const trigger = graph.getTriggerNode();
			expect(trigger.id).toBe('trigger');
			expect(trigger.type).toBe('trigger');
			expect(trigger.name).toBe('Manual Trigger');
		});

		it('should throw if no trigger node exists', () => {
			const graph = new WorkflowGraph({
				nodes: [
					{
						id: 'step1',
						name: 'Step 1',
						type: 'step',
						stepFunctionRef: 'step_1',
						config: {},
					},
				],
				edges: [],
			});
			expect(() => graph.getTriggerNode()).toThrow('No trigger node found in graph');
		});
	});

	describe('getNode', () => {
		it('should return the correct node by ID', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const node = graph.getNode('step1');
			expect(node).toBeDefined();
			expect(node?.id).toBe('step1');
			expect(node?.name).toBe('Step 1');
		});

		it('should return undefined for a missing node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const node = graph.getNode('nonexistent');
			expect(node).toBeUndefined();
		});
	});

	describe('getNodeOrFail', () => {
		it('should return the node when it exists', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const node = graph.getNodeOrFail('step1');
			expect(node.id).toBe('step1');
		});

		it('should throw for a missing node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			expect(() => graph.getNodeOrFail('nonexistent')).toThrow('Node not found: nonexistent');
		});
	});

	describe('getPredecessors', () => {
		it('should return predecessors in a linear graph', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const preds = graph.getPredecessors('step1');
			expect(preds).toHaveLength(1);
			expect(preds[0].id).toBe('trigger');
		});

		it('should return both branches as predecessors for a merge node', () => {
			const graph = new WorkflowGraph(createParallelGraph());
			const preds = graph.getPredecessors('merge');
			expect(preds).toHaveLength(2);
			const predIds = preds.map((n) => n.id).sort();
			expect(predIds).toEqual(['a', 'b']);
		});

		it('should return empty array for the trigger node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const preds = graph.getPredecessors('trigger');
			expect(preds).toHaveLength(0);
		});
	});

	describe('getPredecessorIds', () => {
		it('should return predecessor IDs', () => {
			const graph = new WorkflowGraph(createParallelGraph());
			const predIds = graph.getPredecessorIds('merge').sort();
			expect(predIds).toEqual(['a', 'b']);
		});

		it('should return empty array when no predecessors exist', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const predIds = graph.getPredecessorIds('trigger');
			expect(predIds).toEqual([]);
		});
	});

	describe('getSuccessors', () => {
		it('should return successors in a linear graph without conditions', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const successors = graph.getSuccessors('trigger');
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('step1');
		});

		it('should return multiple successors for parallel branches', () => {
			const graph = new WorkflowGraph(createParallelGraph());
			const successors = graph.getSuccessors('trigger');
			expect(successors).toHaveLength(2);
			const ids = successors.map((n) => n.id).sort();
			expect(ids).toEqual(['a', 'b']);
		});

		it('should return only the matching branch when condition is true', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const successors = graph.getSuccessors('check', { value: 20 });
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('yes');
		});

		it('should return only the matching branch when condition is false', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const successors = graph.getSuccessors('check', { value: 5 });
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('no');
		});

		it('should return empty array when no successors exist', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const successors = graph.getSuccessors('step2');
			expect(successors).toHaveLength(0);
		});

		it('should skip edges whose conditions throw errors', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			// Passing undefined as output causes the condition expression to throw
			const successors = graph.getSuccessors('check', undefined);
			expect(successors).toHaveLength(0);
		});
	});

	describe('getSuccessorEdges', () => {
		it('should return all outgoing edges for a node', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const edges = graph.getSuccessorEdges('check');
			expect(edges).toHaveLength(2);
			expect(edges[0].from).toBe('check');
			expect(edges[1].from).toBe('check');
		});

		it('should return empty array for a leaf node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const edges = graph.getSuccessorEdges('step2');
			expect(edges).toHaveLength(0);
		});
	});

	describe('getLeafNodes', () => {
		it('should return the last node in a linear graph', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const leaves = graph.getLeafNodes();
			expect(leaves).toHaveLength(1);
			expect(leaves[0].id).toBe('step2');
		});

		it('should return the merge node in a parallel graph', () => {
			const graph = new WorkflowGraph(createParallelGraph());
			const leaves = graph.getLeafNodes();
			expect(leaves).toHaveLength(1);
			expect(leaves[0].id).toBe('merge');
		});

		it('should return multiple leaf nodes for a conditional graph', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const leaves = graph.getLeafNodes();
			expect(leaves).toHaveLength(2);
			const ids = leaves.map((n) => n.id).sort();
			expect(ids).toEqual(['no', 'yes']);
		});
	});

	describe('getAllNodes', () => {
		it('should return a copy of all nodes', () => {
			const data = createLinearGraph();
			const graph = new WorkflowGraph(data);
			const allNodes = graph.getAllNodes();
			expect(allNodes).toHaveLength(3);
			// Verify it is a copy (not the same array reference)
			expect(allNodes).not.toBe(data.nodes);
		});
	});

	describe('getAllEdges', () => {
		it('should return a copy of all edges', () => {
			const data = createLinearGraph();
			const graph = new WorkflowGraph(data);
			const allEdges = graph.getAllEdges();
			expect(allEdges).toHaveLength(2);
			expect(allEdges).not.toBe(data.edges);
		});
	});

	describe('getContinuationStepId', () => {
		it('should produce a deterministic ID', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id1 = graph.getContinuationStepId('step1', 0);
			const id2 = graph.getContinuationStepId('step1', 0);
			expect(id1).toBe(id2);
		});

		it('should produce different IDs for different attempt numbers', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id0 = graph.getContinuationStepId('step1', 0);
			const id1 = graph.getContinuationStepId('step1', 1);
			expect(id0).not.toBe(id1);
		});

		it('should produce different IDs for different parent steps', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const idA = graph.getContinuationStepId('step1', 0);
			const idB = graph.getContinuationStepId('step2', 0);
			expect(idA).not.toBe(idB);
		});

		it('should return a 12-character hex string', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id = graph.getContinuationStepId('step1', 0);
			expect(id).toMatch(/^[0-9a-f]{12}$/);
		});
	});

	describe('getContinuationFunctionRef', () => {
		it('should return the continuation ref from the node config', () => {
			const data = createLinearGraph();
			data.nodes[1].config.continuationRef = 'step_1_cont_0';
			const graph = new WorkflowGraph(data);
			expect(graph.getContinuationFunctionRef('step1')).toBe('step_1_cont_0');
		});

		it('should return undefined when there is no continuation ref', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			expect(graph.getContinuationFunctionRef('step1')).toBeUndefined();
		});

		it('should return undefined for a non-existent node', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			expect(graph.getContinuationFunctionRef('nonexistent')).toBeUndefined();
		});
	});

	describe('isContinuationStep', () => {
		it('should return false for nodes that exist in the graph', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			expect(graph.isContinuationStep('trigger')).toBe(false);
			expect(graph.isContinuationStep('step1')).toBe(false);
			expect(graph.isContinuationStep('step2')).toBe(false);
		});

		it('should return true for IDs that are not graph nodes', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			expect(graph.isContinuationStep('some_continuation_id')).toBe(true);
		});
	});

	describe('getFanOutChildStepId', () => {
		it('should produce a deterministic ID', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id1 = graph.getFanOutChildStepId('step1', 0);
			const id2 = graph.getFanOutChildStepId('step1', 0);
			expect(id1).toBe(id2);
		});

		it('should produce different IDs for different item indices', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id0 = graph.getFanOutChildStepId('step1', 0);
			const id1 = graph.getFanOutChildStepId('step1', 1);
			expect(id0).not.toBe(id1);
		});

		it('should return a 12-character hex string', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const id = graph.getFanOutChildStepId('step1', 3);
			expect(id).toMatch(/^[0-9a-f]{12}$/);
		});

		it('should produce different IDs from continuation IDs for the same parent', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const fanOutId = graph.getFanOutChildStepId('step1', 0);
			const contId = graph.getContinuationStepId('step1', 0);
			expect(fanOutId).not.toBe(contId);
		});
	});

	describe('evaluateCondition (via getSuccessors)', () => {
		it('should follow unconditional edges regardless of output', () => {
			const graph = new WorkflowGraph(createLinearGraph());
			const successors = graph.getSuccessors('trigger', undefined);
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('step1');
		});

		it('should evaluate truthy conditions correctly', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const successors = graph.getSuccessors('check', { value: 100 });
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('yes');
		});

		it('should evaluate falsy conditions correctly', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			const successors = graph.getSuccessors('check', { value: 0 });
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('no');
		});

		it('should return false for invalid expressions', () => {
			const data: WorkflowGraphData = {
				nodes: [
					{
						id: 'a',
						name: 'A',
						type: 'step',
						stepFunctionRef: 'step_a',
						config: {},
					},
					{
						id: 'b',
						name: 'B',
						type: 'step',
						stepFunctionRef: 'step_b',
						config: {},
					},
				],
				edges: [{ from: 'a', to: 'b', condition: '???invalid syntax!!!' }],
			};
			const graph = new WorkflowGraph(data);
			const successors = graph.getSuccessors('a', { value: 1 });
			expect(successors).toHaveLength(0);
		});

		it('should handle boundary value in condition', () => {
			const graph = new WorkflowGraph(createConditionalGraph());
			// value === 10, so output.value > 10 is false, output.value <= 10 is true
			const successors = graph.getSuccessors('check', { value: 10 });
			expect(successors).toHaveLength(1);
			expect(successors[0].id).toBe('no');
		});
	});

	describe('toJSON', () => {
		it('should return the underlying graph data', () => {
			const data = createLinearGraph();
			const graph = new WorkflowGraph(data);
			const json = graph.toJSON();
			expect(json).toBe(data);
		});

		it('should contain the correct number of nodes and edges', () => {
			const graph = new WorkflowGraph(createParallelGraph());
			const json = graph.toJSON();
			expect(json.nodes).toHaveLength(4);
			expect(json.edges).toHaveLength(4);
		});
	});
});
