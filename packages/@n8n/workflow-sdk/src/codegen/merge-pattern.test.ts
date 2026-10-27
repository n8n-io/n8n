/**
 * Tests for merge-pattern utilities
 */

import type { BuildContext } from './composite-handlers/build-utils';
import {
	hasOutputsOutsideMerge,
	findDirectMergeInFanOut,
	detectMergePattern,
	findMergeInputIndex,
} from './merge-pattern';
import type { SemanticNode, SemanticGraph } from './types';

// Helper to create a mock SemanticNode
function createMockNode(
	name: string,
	type: string,
	outputs: Map<string, Array<{ target: string; targetInputSlot: string }>> = new Map(),
	inputSources: Map<string, Array<{ from: string; outputSlot: string }>> = new Map(),
): SemanticNode {
	return {
		name,
		type,
		outputs,
		inputSources,
		config: {},
		json: {},
		subnodes: [],
		annotations: {},
	} as unknown as SemanticNode;
}

// Helper to create a mock BuildContext
function createMockContext(nodes: SemanticNode[]): BuildContext {
	const nodeMap = new Map<string, SemanticNode>();
	for (const node of nodes) {
		nodeMap.set(node.name, node);
	}
	return {
		graph: { nodes: nodeMap } as SemanticGraph,
		visited: new Set<string>(),
		variables: new Map<string, SemanticNode>(),
		deferredConnections: [],
		deferredMergeNodes: new Set<string>(),
		deferredMergeDownstreams: new Map<string, SemanticNode[]>(),
		isBranchContext: false,
	} as unknown as BuildContext;
}

describe('merge-pattern', () => {
	describe('hasOutputsOutsideMerge', () => {
		it('should return false when all outputs go to merge', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Node1', outputSlot: 'output' }]],
					['branch1', [{ from: 'Node2', outputSlot: 'output' }]],
				]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]]]),
			);

			expect(hasOutputsOutsideMerge(node1, merge)).toBe(false);
		});

		it('should return true when node has outputs to non-merge destinations', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([['branch0', [{ from: 'Node1', outputSlot: 'output' }]]]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([
					['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['output1', [{ target: 'OtherNode', targetInputSlot: 'input' }]],
				]),
			);

			expect(hasOutputsOutsideMerge(node1, merge)).toBe(true);
		});

		it('should skip error outputs', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([['branch0', [{ from: 'Node1', outputSlot: 'output' }]]]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([
					['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['error', [{ target: 'ErrorHandler', targetInputSlot: 'input' }]],
				]),
			);

			expect(hasOutputsOutsideMerge(node1, merge)).toBe(false);
		});
	});

	describe('findDirectMergeInFanOut', () => {
		it('should return null when no merge in targets', () => {
			const node1 = createMockNode('Node1', 'n8n-nodes-base.httpRequest');
			const node2 = createMockNode('Node2', 'n8n-nodes-base.httpRequest');
			const ctx = createMockContext([node1, node2]);

			expect(findDirectMergeInFanOut(['Node1', 'Node2'], ctx)).toBeNull();
		});

		it('should return null when multiple merge targets', () => {
			const merge1 = createMockNode('Merge1', 'n8n-nodes-base.merge');
			const merge2 = createMockNode('Merge2', 'n8n-nodes-base.merge');
			const ctx = createMockContext([merge1, merge2]);

			expect(findDirectMergeInFanOut(['Merge1', 'Merge2'], ctx)).toBeNull();
		});

		it('should return merge and non-merge targets when pattern detected', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Node1', outputSlot: 'output' }]],
					['branch1', [{ from: 'Node2', outputSlot: 'output' }]],
				]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]]]),
			);
			const node2 = createMockNode(
				'Node2',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch1' }]]]),
			);
			const ctx = createMockContext([merge, node1, node2]);

			const result = findDirectMergeInFanOut(['Node1', 'Node2', 'Merge'], ctx);

			expect(result).not.toBeNull();
			expect(result!.mergeNode.name).toBe('Merge');
			expect(result!.nonMergeTargets).toEqual(['Node1', 'Node2']);
		});

		it('should return null when non-merge targets do not feed into merge', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([['branch0', [{ from: 'SomeOtherNode', outputSlot: 'output' }]]]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Unrelated', targetInputSlot: 'input' }]]]),
			);
			const ctx = createMockContext([merge, node1]);

			expect(findDirectMergeInFanOut(['Node1', 'Merge'], ctx)).toBeNull();
		});
	});

	describe('detectMergePattern', () => {
		it('should return null for single target', () => {
			const node1 = createMockNode('Node1', 'n8n-nodes-base.httpRequest');
			const ctx = createMockContext([node1]);

			expect(detectMergePattern(['Node1'], ctx)).toBeNull();
		});

		it('should return null when targets do not converge at same merge', () => {
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge1', targetInputSlot: 'branch0' }]]]),
			);
			const node2 = createMockNode(
				'Node2',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge2', targetInputSlot: 'branch0' }]]]),
			);
			const merge1 = createMockNode('Merge1', 'n8n-nodes-base.merge');
			const merge2 = createMockNode('Merge2', 'n8n-nodes-base.merge');
			const ctx = createMockContext([node1, node2, merge1, merge2]);

			expect(detectMergePattern(['Node1', 'Node2'], ctx)).toBeNull();
		});

		it('should detect when all targets converge at same merge', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Node1', outputSlot: 'output' }]],
					['branch1', [{ from: 'Node2', outputSlot: 'output' }]],
				]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]]]),
			);
			const node2 = createMockNode(
				'Node2',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch1' }]]]),
			);
			const ctx = createMockContext([merge, node1, node2]);

			const result = detectMergePattern(['Node1', 'Node2'], ctx);

			expect(result).not.toBeNull();
			expect(result!.mergeNode.name).toBe('Merge');
			expect(result!.branches).toEqual(['Node1', 'Node2']);
		});

		it('should return null when branch has outputs outside merge', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Node1', outputSlot: 'output' }]],
					['branch1', [{ from: 'Node2', outputSlot: 'output' }]],
				]),
			);
			const node1 = createMockNode(
				'Node1',
				'n8n-nodes-base.httpRequest',
				new Map([
					['output', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['output1', [{ target: 'OtherNode', targetInputSlot: 'input' }]],
				]),
			);
			const node2 = createMockNode(
				'Node2',
				'n8n-nodes-base.httpRequest',
				new Map([['output', [{ target: 'Merge', targetInputSlot: 'branch1' }]]]),
			);
			const ctx = createMockContext([merge, node1, node2]);

			expect(detectMergePattern(['Node1', 'Node2'], ctx)).toBeNull();
		});
	});

	describe('findMergeInputIndex', () => {
		it('should return 0 when source not found', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([['branch0', [{ from: 'OtherNode', outputSlot: 'output' }]]]),
			);

			expect(findMergeInputIndex(merge, 'UnknownNode')).toBe(0);
		});

		it('should return correct index for source node', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Node1', outputSlot: 'output' }]],
					['branch1', [{ from: 'Node2', outputSlot: 'output' }]],
				]),
			);

			expect(findMergeInputIndex(merge, 'Node1')).toBe(0);
			expect(findMergeInputIndex(merge, 'Node2')).toBe(1);
		});

		it('should match on source output slot when provided', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([
					['branch0', [{ from: 'Switch', outputSlot: 'output0' }]],
					['branch1', [{ from: 'Switch', outputSlot: 'output1' }]],
				]),
			);

			expect(findMergeInputIndex(merge, 'Switch', 'output0')).toBe(0);
			expect(findMergeInputIndex(merge, 'Switch', 'output1')).toBe(1);
		});

		it('should return 0 when output slot does not match', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map(),
				new Map([['branch0', [{ from: 'Switch', outputSlot: 'output0' }]]]),
			);

			expect(findMergeInputIndex(merge, 'Switch', 'output2')).toBe(0);
		});
	});
});
