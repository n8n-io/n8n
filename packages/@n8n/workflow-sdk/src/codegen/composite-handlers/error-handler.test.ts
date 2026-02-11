import { describe, it, expect } from '@jest/globals';

import { buildErrorHandler, hasErrorOutput, getErrorOutputTargets } from './error-handler';
import type { OnError } from '../../types/base';
import type { CompositeNode, LeafNode } from '../composite-tree';
import type { SemanticGraph, SemanticNode } from '../types';

/**
 * Create a minimal semantic node for testing
 */
function createSemanticNode(
	name: string,
	type: string,
	outputs: Map<string, Array<{ target: string; targetInputSlot: string }>> = new Map(),
	onError?: OnError,
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
			onError,
		},
		outputs,
		inputSources: new Map(),
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

describe('hasErrorOutput', () => {
	it('returns true when node has onError: continueErrorOutput', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map(),
			'continueErrorOutput',
		);
		expect(hasErrorOutput(node)).toBe(true);
	});

	it('returns false when node has different onError value', () => {
		const node = createSemanticNode('Node', 'n8n-nodes-base.noOp', new Map(), 'stopWorkflow');
		expect(hasErrorOutput(node)).toBe(false);
	});

	it('returns false when node has no onError', () => {
		const node = createSemanticNode('Node', 'n8n-nodes-base.noOp');
		expect(hasErrorOutput(node)).toBe(false);
	});
});

describe('getErrorOutputTargets', () => {
	it('returns error output targets', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([
				['output0', [{ target: 'Next', targetInputSlot: 'input' }]],
				['error', [{ target: 'ErrorHandler', targetInputSlot: 'input' }]],
			]),
		);
		expect(getErrorOutputTargets(node)).toEqual(['ErrorHandler']);
	});

	it('returns empty array when no error output', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([['output0', [{ target: 'Next', targetInputSlot: 'input' }]]]),
		);
		expect(getErrorOutputTargets(node)).toEqual([]);
	});

	it('returns multiple targets when error output has multiple connections', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([
				[
					'error',
					[
						{ target: 'ErrorHandler1', targetInputSlot: 'input' },
						{ target: 'ErrorHandler2', targetInputSlot: 'input' },
					],
				],
			]),
		);
		expect(getErrorOutputTargets(node)).toEqual(['ErrorHandler1', 'ErrorHandler2']);
	});
});

describe('buildErrorHandler', () => {
	it('builds error handler chain for node with error output', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([['error', [{ target: 'ErrorHandler', targetInputSlot: 'input' }]]]),
			'continueErrorOutput',
		);

		const errorHandler = createSemanticNode('ErrorHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Node', node],
				['ErrorHandler', errorHandler],
			]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildErrorHandler(node, ctx);

		expect(result).not.toBeUndefined();
		const handler = result as LeafNode;
		expect(handler.kind).toBe('leaf');
		expect(handler.node.name).toBe('ErrorHandler');
	});

	it('returns undefined when node has no error output', () => {
		const node = createSemanticNode('Node', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([['Node', node]]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildErrorHandler(node, ctx);

		expect(result).toBeUndefined();
	});

	it('returns undefined when error output has no targets', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([['error', []]]),
			'continueErrorOutput',
		);

		const graph: SemanticGraph = {
			nodes: new Map([['Node', node]]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildErrorHandler(node, ctx);

		expect(result).toBeUndefined();
	});

	it('returns varRef when error target is already visited', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([['error', [{ target: 'SharedHandler', targetInputSlot: 'input' }]]]),
			'continueErrorOutput',
		);

		const sharedHandler = createSemanticNode('SharedHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Node', node],
				['SharedHandler', sharedHandler],
			]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		// Mark as already visited
		ctx.visited.add('SharedHandler');

		const result = buildErrorHandler(node, ctx);

		expect(result).not.toBeUndefined();
		expect(result?.kind).toBe('varRef');
		expect((result as { nodeName: string }).nodeName).toBe('SharedHandler');
	});

	it('marks error handler as visited', () => {
		const node = createSemanticNode(
			'Node',
			'n8n-nodes-base.noOp',
			new Map([['error', [{ target: 'ErrorHandler', targetInputSlot: 'input' }]]]),
			'continueErrorOutput',
		);

		const errorHandler = createSemanticNode('ErrorHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Node', node],
				['ErrorHandler', errorHandler],
			]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildErrorHandler(node, ctx);

		expect(ctx.visited.has('ErrorHandler')).toBe(true);
	});
});
