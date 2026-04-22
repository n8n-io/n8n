import { describe, it, expect } from '@jest/globals';

import { buildSplitInBatchesComposite, type BuildContext } from './sib-handler';
import type { CompositeNode, LeafNode } from '../composite-tree';
import type { SemanticGraph, SemanticNode, SourceInfo } from '../types';

/**
 * Create a minimal semantic node for testing
 */
function createSemanticNode(
	name: string,
	type: string,
	outputs: Map<string, Array<{ target: string; targetInputSlot: string }>> = new Map(),
	inputSources: Map<string, SourceInfo[]> = new Map(),
): SemanticNode {
	return {
		name,
		type,
		json: {
			id: name,
			name,
			type,
			typeVersion: 1,
			position: [0, 0],
		},
		outputs,
		inputSources,
		subnodes: [],
		annotations: {
			isTrigger: false,
			isCycleTarget: false,
			isConvergencePoint: false,
		},
	};
}

/**
 * Create a minimal build context for testing
 */
function createBuildContext(graph: SemanticGraph): BuildContext {
	return {
		graph,
		visited: new Set<string>(),
		variables: new Map<string, SemanticNode>(),
		isBranchContext: false,
		deferredConnections: [],
		deferredMergeDownstreams: [] as Array<{
			mergeNode: SemanticNode;
			downstreamChain: CompositeNode | null;
		}>,
		deferredMergeNodes: new Set<string>(),
	};
}

describe('buildSplitInBatchesComposite', () => {
	it('builds SplitInBatches node with done and loop branches', () => {
		// Create the SIB node with done (output 0) and loop (output 1) branches
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', [{ target: 'DoneHandler', targetInputSlot: 'input' }]],
				['loop', [{ target: 'LoopBody', targetInputSlot: 'input' }]],
			]),
		);

		// Create branch targets
		const doneHandler = createSemanticNode('DoneHandler', 'n8n-nodes-base.noOp');
		const loopBody = createSemanticNode('LoopBody', 'n8n-nodes-base.noOp');

		// Build the graph
		const graph: SemanticGraph = {
			nodes: new Map([
				['SplitInBatches', sibNode],
				['DoneHandler', doneHandler],
				['LoopBody', loopBody],
			]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);

		// Build the composite
		const result = buildSplitInBatchesComposite(sibNode, ctx);

		// Verify structure
		expect(result.kind).toBe('splitInBatches');
		expect(result.sibNode.name).toBe('SplitInBatches');
		expect(result.doneChain).not.toBeNull();
		expect(result.loopChain).not.toBeNull();

		// Verify done chain
		const doneChain = result.doneChain as LeafNode;
		expect(doneChain.kind).toBe('leaf');
		expect(doneChain.node.name).toBe('DoneHandler');

		// Verify loop chain
		const loopChain = result.loopChain as LeafNode;
		expect(loopChain.kind).toBe('leaf');
		expect(loopChain.node.name).toBe('LoopBody');
	});

	it('handles SplitInBatches with only done branch', () => {
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', [{ target: 'DoneHandler', targetInputSlot: 'input' }]],
				['loop', []],
			]),
		);

		const doneHandler = createSemanticNode('DoneHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['SplitInBatches', sibNode],
				['DoneHandler', doneHandler],
			]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSplitInBatchesComposite(sibNode, ctx);

		expect(result.kind).toBe('splitInBatches');
		expect(result.doneChain).not.toBeNull();
		expect(result.loopChain).toBeNull();
	});

	it('handles SplitInBatches with only loop branch', () => {
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', []],
				['loop', [{ target: 'LoopBody', targetInputSlot: 'input' }]],
			]),
		);

		const loopBody = createSemanticNode('LoopBody', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['SplitInBatches', sibNode],
				['LoopBody', loopBody],
			]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSplitInBatchesComposite(sibNode, ctx);

		expect(result.kind).toBe('splitInBatches');
		expect(result.doneChain).toBeNull();
		expect(result.loopChain).not.toBeNull();
	});

	it('handles SplitInBatches with no branches', () => {
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', []],
				['loop', []],
			]),
		);

		const graph: SemanticGraph = {
			nodes: new Map([['SplitInBatches', sibNode]]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSplitInBatchesComposite(sibNode, ctx);

		expect(result.kind).toBe('splitInBatches');
		expect(result.doneChain).toBeNull();
		expect(result.loopChain).toBeNull();
	});

	it('marks branch targets as visited in context', () => {
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', [{ target: 'DoneHandler', targetInputSlot: 'input' }]],
				['loop', [{ target: 'LoopBody', targetInputSlot: 'input' }]],
			]),
		);

		const doneHandler = createSemanticNode('DoneHandler', 'n8n-nodes-base.noOp');
		const loopBody = createSemanticNode('LoopBody', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['SplitInBatches', sibNode],
				['DoneHandler', doneHandler],
				['LoopBody', loopBody],
			]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildSplitInBatchesComposite(sibNode, ctx);

		// Branch targets should be marked as visited
		expect(ctx.visited.has('DoneHandler')).toBe(true);
		expect(ctx.visited.has('LoopBody')).toBe(true);
	});

	it('returns SplitInBatchesCompositeNode when no SIB-merge pattern detected', () => {
		// Simple SIB without going to same merge at different inputs
		const sibNode = createSemanticNode(
			'SplitInBatches',
			'n8n-nodes-base.splitInBatches',
			new Map([
				['done', [{ target: 'Done', targetInputSlot: 'input' }]],
				['loop', [{ target: 'Loop', targetInputSlot: 'input' }]],
			]),
		);

		const done = createSemanticNode('Done', 'n8n-nodes-base.noOp');
		const loop = createSemanticNode('Loop', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['SplitInBatches', sibNode],
				['Done', done],
				['Loop', loop],
			]),
			roots: ['SplitInBatches'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSplitInBatchesComposite(sibNode, ctx);

		// Should be a SplitInBatchesCompositeNode, not ExplicitConnectionsNode
		expect(result.kind).toBe('splitInBatches');
	});
});
