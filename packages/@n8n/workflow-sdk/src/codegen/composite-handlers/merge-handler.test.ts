import { describe, it, expect } from '@jest/globals';

import { buildMergeComposite, type BuildContext } from './merge-handler';
import type { CompositeNode } from '../composite-tree';
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

describe('buildMergeComposite', () => {
	it('builds Merge node and creates deferred connections', () => {
		// Create the Merge node with 2 inputs
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map(),
			new Map([
				['branch0', [{ from: 'Branch1', outputSlot: 'output0' }]],
				['branch1', [{ from: 'Branch2', outputSlot: 'output0' }]],
			]),
		);

		// Create branch sources
		const branch1 = createSemanticNode('Branch1', 'n8n-nodes-base.noOp');
		const branch2 = createSemanticNode('Branch2', 'n8n-nodes-base.noOp');

		// Build the graph
		const graph: SemanticGraph = {
			nodes: new Map([
				['Merge', mergeNode],
				['Branch1', branch1],
				['Branch2', branch2],
			]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);

		// Build the composite
		const result = buildMergeComposite(mergeNode, ctx);

		// Verify it returns a variable reference
		expect(result.kind).toBe('varRef');
		expect(result.nodeName).toBe('Merge');

		// Verify merge node is registered as a variable
		expect(ctx.variables.has('Merge')).toBe(true);

		// Verify merge is added to deferred merge nodes
		expect(ctx.deferredMergeNodes.has('Merge')).toBe(true);

		// Verify deferred connections were created for both inputs
		expect(ctx.deferredConnections).toHaveLength(2);

		// Check Branch1 -> Merge input 0
		const branch1Conn = ctx.deferredConnections.find(
			(c) => c.sourceNodeName === 'Branch1' && c.targetInputIndex === 0,
		);
		expect(branch1Conn).toBeDefined();
		expect(branch1Conn?.targetNode.name).toBe('Merge');

		// Check Branch2 -> Merge input 1
		const branch2Conn = ctx.deferredConnections.find(
			(c) => c.sourceNodeName === 'Branch2' && c.targetInputIndex === 1,
		);
		expect(branch2Conn).toBeDefined();
		expect(branch2Conn?.targetNode.name).toBe('Merge');
	});

	it('registers source nodes as variables', () => {
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map(),
			new Map([
				['branch0', [{ from: 'Branch1', outputSlot: 'output0' }]],
				['branch1', [{ from: 'Branch2', outputSlot: 'output0' }]],
			]),
		);

		const branch1 = createSemanticNode('Branch1', 'n8n-nodes-base.noOp');
		const branch2 = createSemanticNode('Branch2', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Merge', mergeNode],
				['Branch1', branch1],
				['Branch2', branch2],
			]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildMergeComposite(mergeNode, ctx);

		// Source nodes should be registered as variables
		expect(ctx.variables.has('Branch1')).toBe(true);
		expect(ctx.variables.has('Branch2')).toBe(true);
	});

	it('handles merge with single input', () => {
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map(),
			new Map([['branch0', [{ from: 'Source', outputSlot: 'output0' }]]]),
		);

		const source = createSemanticNode('Source', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Merge', mergeNode],
				['Source', source],
			]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildMergeComposite(mergeNode, ctx);

		expect(result.kind).toBe('varRef');
		expect(ctx.deferredConnections).toHaveLength(1);
		expect(ctx.deferredConnections[0].sourceNodeName).toBe('Source');
		expect(ctx.deferredConnections[0].targetInputIndex).toBe(0);
	});

	it('handles merge with no inputs', () => {
		const mergeNode = createSemanticNode('Merge', 'n8n-nodes-base.merge', new Map(), new Map());

		const graph: SemanticGraph = {
			nodes: new Map([['Merge', mergeNode]]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildMergeComposite(mergeNode, ctx);

		expect(result.kind).toBe('varRef');
		expect(ctx.deferredConnections).toHaveLength(0);
	});

	it('extracts correct output index from source output slot', () => {
		// Source with output1 (not output0)
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map(),
			new Map([['branch0', [{ from: 'MultiOutput', outputSlot: 'output1' }]]]),
		);

		const multiOutput = createSemanticNode('MultiOutput', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Merge', mergeNode],
				['MultiOutput', multiOutput],
			]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildMergeComposite(mergeNode, ctx);

		expect(ctx.deferredConnections).toHaveLength(1);
		expect(ctx.deferredConnections[0].sourceOutputIndex).toBe(1);
	});

	it('handles multiple sources to same input', () => {
		// Multiple sources connecting to the same merge input
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map(),
			new Map([
				[
					'branch0',
					[
						{ from: 'SourceA', outputSlot: 'output0' },
						{ from: 'SourceB', outputSlot: 'output0' },
					],
				],
			]),
		);

		const sourceA = createSemanticNode('SourceA', 'n8n-nodes-base.noOp');
		const sourceB = createSemanticNode('SourceB', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Merge', mergeNode],
				['SourceA', sourceA],
				['SourceB', sourceB],
			]),
			roots: ['Merge'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildMergeComposite(mergeNode, ctx);

		// Both sources should have deferred connections
		expect(ctx.deferredConnections).toHaveLength(2);
		expect(ctx.deferredConnections.map((c) => c.sourceNodeName).sort()).toEqual([
			'SourceA',
			'SourceB',
		]);
		// Both should connect to input 0
		expect(ctx.deferredConnections.every((c) => c.targetInputIndex === 0)).toBe(true);
	});
});
