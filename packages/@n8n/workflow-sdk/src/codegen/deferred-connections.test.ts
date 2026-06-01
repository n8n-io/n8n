import { describe, it, expect } from '@jest/globals';

import type { CompositeNode } from './composite-tree';
import {
	createDeferredConnection,
	findMergeInputIndex,
	type DeferredConnectionParams,
} from './deferred-connections';
import type { SemanticGraph, SemanticNode, SourceInfo } from './types';

/**
 * Create a minimal semantic node for testing
 */
function createSemanticNode(
	name: string,
	type: string,
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
		outputs: new Map(),
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
function createBuildContext(graph: SemanticGraph) {
	return {
		graph,
		visited: new Set<string>(),
		variables: new Map<string, SemanticNode>(),
		isBranchContext: false,
		deferredConnections: [] as Array<{
			targetNode: SemanticNode;
			targetInputIndex: number;
			sourceNodeName: string;
			sourceOutputIndex: number;
		}>,
		deferredMergeDownstreams: [] as Array<{
			mergeNode: SemanticNode;
			downstreamChain: CompositeNode | null;
		}>,
		deferredMergeNodes: new Set<string>(),
	};
}

describe('createDeferredConnection', () => {
	it('adds connection to context', () => {
		const mergeNode = createSemanticNode('Merge', 'n8n-nodes-base.merge');
		const graph: SemanticGraph = {
			nodes: new Map([['Merge', mergeNode]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createBuildContext(graph);

		const params: DeferredConnectionParams = {
			targetNode: mergeNode,
			targetInputIndex: 0,
			sourceNodeName: 'Source',
			sourceOutputIndex: 0,
		};

		createDeferredConnection(params, ctx);

		expect(ctx.deferredConnections).toHaveLength(1);
		expect(ctx.deferredConnections[0].targetNode).toBe(mergeNode);
		expect(ctx.deferredConnections[0].targetInputIndex).toBe(0);
		expect(ctx.deferredConnections[0].sourceNodeName).toBe('Source');
		expect(ctx.deferredConnections[0].sourceOutputIndex).toBe(0);
	});

	it('adds multiple connections to context', () => {
		const mergeNode = createSemanticNode('Merge', 'n8n-nodes-base.merge');
		const graph: SemanticGraph = {
			nodes: new Map([['Merge', mergeNode]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createBuildContext(graph);

		createDeferredConnection(
			{
				targetNode: mergeNode,
				targetInputIndex: 0,
				sourceNodeName: 'Source1',
				sourceOutputIndex: 0,
			},
			ctx,
		);
		createDeferredConnection(
			{
				targetNode: mergeNode,
				targetInputIndex: 1,
				sourceNodeName: 'Source2',
				sourceOutputIndex: 0,
			},
			ctx,
		);

		expect(ctx.deferredConnections).toHaveLength(2);
	});
});

describe('findMergeInputIndex', () => {
	it('returns correct input index for source', () => {
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map([
				['branch0', [{ from: 'Branch1', outputSlot: 'output0' }]],
				['branch1', [{ from: 'Branch2', outputSlot: 'output0' }]],
			]),
		);

		const index = findMergeInputIndex(mergeNode, 'Branch1');
		expect(index).toBe(0);
	});

	it('returns correct index for second branch', () => {
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map([
				['branch0', [{ from: 'Branch1', outputSlot: 'output0' }]],
				['branch1', [{ from: 'Branch2', outputSlot: 'output0' }]],
			]),
		);

		const index = findMergeInputIndex(mergeNode, 'Branch2');
		expect(index).toBe(1);
	});

	it('returns 0 when source not found', () => {
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map([['branch0', [{ from: 'Branch1', outputSlot: 'output0' }]]]),
		);

		const index = findMergeInputIndex(mergeNode, 'Unknown');
		expect(index).toBe(0);
	});

	it('matches on source output slot when provided', () => {
		// Same source connects to different merge inputs from different outputs
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map([
				['branch0', [{ from: 'MultiOutput', outputSlot: 'output0' }]],
				['branch1', [{ from: 'MultiOutput', outputSlot: 'output1' }]],
			]),
		);

		// Find connection from output0
		const index0 = findMergeInputIndex(mergeNode, 'MultiOutput', 'output0');
		expect(index0).toBe(0);

		// Find connection from output1
		const index1 = findMergeInputIndex(mergeNode, 'MultiOutput', 'output1');
		expect(index1).toBe(1);
	});

	it('handles input slot names with different prefixes', () => {
		// Some merge nodes use 'input' prefix, others use 'branch'
		const mergeNode = createSemanticNode(
			'Merge',
			'n8n-nodes-base.merge',
			new Map([
				['input0', [{ from: 'Branch1', outputSlot: 'output0' }]],
				['input2', [{ from: 'Branch2', outputSlot: 'output0' }]],
			]),
		);

		expect(findMergeInputIndex(mergeNode, 'Branch1')).toBe(0);
		expect(findMergeInputIndex(mergeNode, 'Branch2')).toBe(2);
	});
});
