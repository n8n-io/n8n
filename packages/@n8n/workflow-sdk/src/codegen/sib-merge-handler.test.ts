/**
 * Tests for SIB (SplitInBatches) merge handler utilities
 */

import type { BuildContext } from './composite-handlers/build-utils';
import { detectSibMergePattern, buildSibMergeExplicitConnections } from './sib-merge-handler';
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

describe('sib-merge-handler', () => {
	describe('detectSibMergePattern', () => {
		it('should return null when SIB has no outputs', () => {
			const sibNode = createMockNode('SIB', 'n8n-nodes-base.splitInBatches');
			const ctx = createMockContext([sibNode]);

			expect(detectSibMergePattern(sibNode, ctx)).toBeNull();
		});

		it('should return null when SIB only has done output', () => {
			const merge = createMockNode('Merge', 'n8n-nodes-base.merge');
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]]]),
			);
			const ctx = createMockContext([sibNode, merge]);

			expect(detectSibMergePattern(sibNode, ctx)).toBeNull();
		});

		it('should return null when SIB only has loop output', () => {
			const merge = createMockNode('Merge', 'n8n-nodes-base.merge');
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]]]),
			);
			const ctx = createMockContext([sibNode, merge]);

			expect(detectSibMergePattern(sibNode, ctx)).toBeNull();
		});

		it('should return null when done and loop go to different merge nodes', () => {
			const merge1 = createMockNode('Merge1', 'n8n-nodes-base.merge');
			const merge2 = createMockNode('Merge2', 'n8n-nodes-base.merge');
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge1', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge2', targetInputSlot: 'branch0' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge1, merge2]);

			expect(detectSibMergePattern(sibNode, ctx)).toBeNull();
		});

		it('should detect pattern when done and loop both go to same merge', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map([['output', [{ target: 'NextNode', targetInputSlot: 'input0' }]]]),
			);
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);

			const result = detectSibMergePattern(sibNode, ctx);

			expect(result).not.toBeNull();
			expect(result!.sibNode.name).toBe('SIB');
			expect(result!.mergeNode.name).toBe('Merge');
			expect(result!.connections).toHaveLength(2);
			expect(result!.connections).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ sibOutput: 'done', sibOutputIndex: 0, mergeInputIndex: 0 }),
					expect.objectContaining({ sibOutput: 'loop', sibOutputIndex: 1, mergeInputIndex: 1 }),
				]),
			);
		});

		it('should capture merge output connections', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map([['output', [{ target: 'NextNode', targetInputSlot: 'input0' }]]]),
			);
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);

			const result = detectSibMergePattern(sibNode, ctx);

			expect(result!.mergeOutputs).toEqual([
				{ target: 'NextNode', inputSlot: 'input0', inputIndex: 0 },
			]);
		});
	});

	describe('buildSibMergeExplicitConnections', () => {
		it('should build explicit connections node', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map([['output', [{ target: 'NextNode', targetInputSlot: 'input0' }]]]),
			);
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);
			const pattern = detectSibMergePattern(sibNode, ctx)!;

			const result = buildSibMergeExplicitConnections(pattern, ctx);

			expect(result.kind).toBe('explicitConnections');
			expect(result.nodes).toHaveLength(2);
			expect(result.nodes[0].name).toBe('SIB');
			expect(result.nodes[1].name).toBe('Merge');
		});

		it('should include SIB to merge connections', () => {
			const merge = createMockNode('Merge', 'n8n-nodes-base.merge', new Map([['output', []]]));
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);
			const pattern = detectSibMergePattern(sibNode, ctx)!;

			const result = buildSibMergeExplicitConnections(pattern, ctx);

			expect(result.connections).toEqual(
				expect.arrayContaining([
					{ sourceNode: 'SIB', sourceOutput: 0, targetNode: 'Merge', targetInput: 0 },
					{ sourceNode: 'SIB', sourceOutput: 1, targetNode: 'Merge', targetInput: 1 },
				]),
			);
		});

		it('should include merge output connections', () => {
			const merge = createMockNode(
				'Merge',
				'n8n-nodes-base.merge',
				new Map([['output', [{ target: 'NextNode', targetInputSlot: 'input0' }]]]),
			);
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);
			const pattern = detectSibMergePattern(sibNode, ctx)!;

			const result = buildSibMergeExplicitConnections(pattern, ctx);

			expect(result.connections).toEqual(
				expect.arrayContaining([
					{ sourceNode: 'Merge', sourceOutput: 0, targetNode: 'NextNode', targetInput: 0 },
				]),
			);
		});

		it('should register nodes as variables', () => {
			const merge = createMockNode('Merge', 'n8n-nodes-base.merge', new Map([['output', []]]));
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);
			const pattern = detectSibMergePattern(sibNode, ctx)!;

			buildSibMergeExplicitConnections(pattern, ctx);

			expect(ctx.variables.has('SIB')).toBe(true);
			expect(ctx.variables.has('Merge')).toBe(true);
		});

		it('should mark nodes as visited', () => {
			const merge = createMockNode('Merge', 'n8n-nodes-base.merge', new Map([['output', []]]));
			const sibNode = createMockNode(
				'SIB',
				'n8n-nodes-base.splitInBatches',
				new Map([
					['done', [{ target: 'Merge', targetInputSlot: 'branch0' }]],
					['loop', [{ target: 'Merge', targetInputSlot: 'branch1' }]],
				]),
			);
			const ctx = createMockContext([sibNode, merge]);
			const pattern = detectSibMergePattern(sibNode, ctx)!;

			buildSibMergeExplicitConnections(pattern, ctx);

			expect(ctx.visited.has('SIB')).toBe(true);
			expect(ctx.visited.has('Merge')).toBe(true);
		});
	});
});
