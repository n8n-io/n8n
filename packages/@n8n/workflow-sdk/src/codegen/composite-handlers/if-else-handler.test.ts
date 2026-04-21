import { describe, it, expect } from '@jest/globals';

import { buildIfElseComposite, type BuildContext } from './if-else-handler';
import type { CompositeNode, LeafNode } from '../composite-tree';
import type { SemanticGraph, SemanticNode } from '../types';

/**
 * Create a minimal semantic node for testing
 */
function createSemanticNode(
	name: string,
	type: string,
	outputs: Map<string, Array<{ target: string; targetInputSlot: string }>> = new Map(),
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

describe('buildIfElseComposite', () => {
	it('builds IF node with true/false branches', () => {
		// Create the IF node
		const ifNode = createSemanticNode(
			'IF',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', [{ target: 'TrueHandler', targetInputSlot: 'input' }]],
				['falseBranch', [{ target: 'FalseHandler', targetInputSlot: 'input' }]],
			]),
		);

		// Create branch targets
		const trueHandler = createSemanticNode('TrueHandler', 'n8n-nodes-base.noOp');
		const falseHandler = createSemanticNode('FalseHandler', 'n8n-nodes-base.noOp');

		// Build the graph
		const graph: SemanticGraph = {
			nodes: new Map([
				['IF', ifNode],
				['TrueHandler', trueHandler],
				['FalseHandler', falseHandler],
			]),
			roots: ['IF'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);

		// Build the composite
		const result = buildIfElseComposite(ifNode, ctx);

		// Verify structure
		expect(result.kind).toBe('ifElse');
		expect(result.ifNode.name).toBe('IF');
		expect(result.trueBranch).not.toBeNull();
		expect(result.falseBranch).not.toBeNull();

		// Verify true branch is a leaf with TrueHandler
		const trueBranch = result.trueBranch as LeafNode;
		expect(trueBranch.kind).toBe('leaf');
		expect(trueBranch.node.name).toBe('TrueHandler');

		// Verify false branch is a leaf with FalseHandler
		const falseBranch = result.falseBranch as LeafNode;
		expect(falseBranch.kind).toBe('leaf');
		expect(falseBranch.node.name).toBe('FalseHandler');
	});

	it('handles IF with only true branch', () => {
		const ifNode = createSemanticNode(
			'IF',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', [{ target: 'TrueHandler', targetInputSlot: 'input' }]],
				['falseBranch', []], // Empty false branch
			]),
		);

		const trueHandler = createSemanticNode('TrueHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['IF', ifNode],
				['TrueHandler', trueHandler],
			]),
			roots: ['IF'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildIfElseComposite(ifNode, ctx);

		expect(result.kind).toBe('ifElse');
		expect(result.trueBranch).not.toBeNull();
		expect(result.falseBranch).toBeNull();
	});

	it('handles IF with only false branch', () => {
		const ifNode = createSemanticNode(
			'IF',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', []], // Empty true branch
				['falseBranch', [{ target: 'FalseHandler', targetInputSlot: 'input' }]],
			]),
		);

		const falseHandler = createSemanticNode('FalseHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['IF', ifNode],
				['FalseHandler', falseHandler],
			]),
			roots: ['IF'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildIfElseComposite(ifNode, ctx);

		expect(result.kind).toBe('ifElse');
		expect(result.trueBranch).toBeNull();
		expect(result.falseBranch).not.toBeNull();
	});

	it('handles IF with no branches', () => {
		const ifNode = createSemanticNode(
			'IF',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', []],
				['falseBranch', []],
			]),
		);

		const graph: SemanticGraph = {
			nodes: new Map([['IF', ifNode]]),
			roots: ['IF'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildIfElseComposite(ifNode, ctx);

		expect(result.kind).toBe('ifElse');
		expect(result.trueBranch).toBeNull();
		expect(result.falseBranch).toBeNull();
	});

	it('handles nested IF nodes', () => {
		// IF1 -> IF2 (true branch) -> Handler
		const ifNode1 = createSemanticNode(
			'IF1',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', [{ target: 'IF2', targetInputSlot: 'input' }]],
				['falseBranch', []],
			]),
		);

		const ifNode2 = createSemanticNode(
			'IF2',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', [{ target: 'Handler', targetInputSlot: 'input' }]],
				['falseBranch', []],
			]),
		);

		const handler = createSemanticNode('Handler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['IF1', ifNode1],
				['IF2', ifNode2],
				['Handler', handler],
			]),
			roots: ['IF1'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildIfElseComposite(ifNode1, ctx);

		expect(result.kind).toBe('ifElse');
		expect(result.trueBranch).not.toBeNull();

		// The nested IF should be built recursively
		// Due to how buildFromNode works internally, it will chain properly
	});

	it('marks branch targets as visited in context', () => {
		const ifNode = createSemanticNode(
			'IF',
			'n8n-nodes-base.if',
			new Map([
				['trueBranch', [{ target: 'TrueHandler', targetInputSlot: 'input' }]],
				['falseBranch', [{ target: 'FalseHandler', targetInputSlot: 'input' }]],
			]),
		);

		const trueHandler = createSemanticNode('TrueHandler', 'n8n-nodes-base.noOp');
		const falseHandler = createSemanticNode('FalseHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['IF', ifNode],
				['TrueHandler', trueHandler],
				['FalseHandler', falseHandler],
			]),
			roots: ['IF'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildIfElseComposite(ifNode, ctx);

		// Branch targets should be marked as visited
		expect(ctx.visited.has('TrueHandler')).toBe(true);
		expect(ctx.visited.has('FalseHandler')).toBe(true);
	});
});
