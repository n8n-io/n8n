import { describe, it, expect } from '@jest/globals';

import { buildSwitchCaseComposite, type BuildContext } from './switch-case-handler';
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

describe('buildSwitchCaseComposite', () => {
	it('builds Switch node with multiple cases', () => {
		// Create the Switch node
		const switchNode = createSemanticNode(
			'Switch',
			'n8n-nodes-base.switch',
			new Map([
				['case0', [{ target: 'Handler0', targetInputSlot: 'input' }]],
				['case1', [{ target: 'Handler1', targetInputSlot: 'input' }]],
				['case2', [{ target: 'Handler2', targetInputSlot: 'input' }]],
			]),
		);

		// Create case handlers
		const handler0 = createSemanticNode('Handler0', 'n8n-nodes-base.noOp');
		const handler1 = createSemanticNode('Handler1', 'n8n-nodes-base.noOp');
		const handler2 = createSemanticNode('Handler2', 'n8n-nodes-base.noOp');

		// Build the graph
		const graph: SemanticGraph = {
			nodes: new Map([
				['Switch', switchNode],
				['Handler0', handler0],
				['Handler1', handler1],
				['Handler2', handler2],
			]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);

		// Build the composite
		const result = buildSwitchCaseComposite(switchNode, ctx);

		// Verify structure
		expect(result.kind).toBe('switchCase');
		expect(result.switchNode.name).toBe('Switch');
		expect(result.cases).toHaveLength(3);
		expect(result.caseIndices).toEqual([0, 1, 2]);

		// Verify each case
		const case0 = result.cases[0] as LeafNode;
		expect(case0.kind).toBe('leaf');
		expect(case0.node.name).toBe('Handler0');

		const case1 = result.cases[1] as LeafNode;
		expect(case1.kind).toBe('leaf');
		expect(case1.node.name).toBe('Handler1');

		const case2 = result.cases[2] as LeafNode;
		expect(case2.kind).toBe('leaf');
		expect(case2.node.name).toBe('Handler2');
	});

	it('handles Switch with empty cases', () => {
		const switchNode = createSemanticNode(
			'Switch',
			'n8n-nodes-base.switch',
			new Map([
				['case0', [{ target: 'Handler0', targetInputSlot: 'input' }]],
				['case1', []], // Empty case
				['case2', [{ target: 'Handler2', targetInputSlot: 'input' }]],
			]),
		);

		const handler0 = createSemanticNode('Handler0', 'n8n-nodes-base.noOp');
		const handler2 = createSemanticNode('Handler2', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Switch', switchNode],
				['Handler0', handler0],
				['Handler2', handler2],
			]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSwitchCaseComposite(switchNode, ctx);

		expect(result.kind).toBe('switchCase');
		expect(result.cases).toHaveLength(3);

		// case0 has handler
		expect(result.cases[0]).not.toBeNull();
		// case1 is empty
		expect(result.cases[1]).toBeNull();
		// case2 has handler
		expect(result.cases[2]).not.toBeNull();
	});

	it('handles Switch with fallback output', () => {
		const switchNode = createSemanticNode(
			'Switch',
			'n8n-nodes-base.switch',
			new Map([
				['case0', [{ target: 'Handler0', targetInputSlot: 'input' }]],
				['fallback', [{ target: 'FallbackHandler', targetInputSlot: 'input' }]],
			]),
		);

		const handler0 = createSemanticNode('Handler0', 'n8n-nodes-base.noOp');
		const fallbackHandler = createSemanticNode('FallbackHandler', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Switch', switchNode],
				['Handler0', handler0],
				['FallbackHandler', fallbackHandler],
			]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSwitchCaseComposite(switchNode, ctx);

		expect(result.kind).toBe('switchCase');
		expect(result.cases).toHaveLength(2);
		// Fallback index should be calculated correctly
		expect(result.caseIndices).toEqual([0, 1]);
	});

	it('handles Switch with no cases', () => {
		const switchNode = createSemanticNode('Switch', 'n8n-nodes-base.switch', new Map());

		const graph: SemanticGraph = {
			nodes: new Map([['Switch', switchNode]]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSwitchCaseComposite(switchNode, ctx);

		expect(result.kind).toBe('switchCase');
		expect(result.cases).toHaveLength(0);
		expect(result.caseIndices).toEqual([]);
	});

	it('marks case targets as visited in context', () => {
		const switchNode = createSemanticNode(
			'Switch',
			'n8n-nodes-base.switch',
			new Map([
				['case0', [{ target: 'Handler0', targetInputSlot: 'input' }]],
				['case1', [{ target: 'Handler1', targetInputSlot: 'input' }]],
			]),
		);

		const handler0 = createSemanticNode('Handler0', 'n8n-nodes-base.noOp');
		const handler1 = createSemanticNode('Handler1', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Switch', switchNode],
				['Handler0', handler0],
				['Handler1', handler1],
			]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		buildSwitchCaseComposite(switchNode, ctx);

		// Case targets should be marked as visited
		expect(ctx.visited.has('Handler0')).toBe(true);
		expect(ctx.visited.has('Handler1')).toBe(true);
	});

	it('handles sparse case indices', () => {
		// Cases 0 and 3 (skipping 1, 2)
		const switchNode = createSemanticNode(
			'Switch',
			'n8n-nodes-base.switch',
			new Map([
				['case0', [{ target: 'Handler0', targetInputSlot: 'input' }]],
				['case3', [{ target: 'Handler3', targetInputSlot: 'input' }]],
			]),
		);

		const handler0 = createSemanticNode('Handler0', 'n8n-nodes-base.noOp');
		const handler3 = createSemanticNode('Handler3', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([
				['Switch', switchNode],
				['Handler0', handler0],
				['Handler3', handler3],
			]),
			roots: ['Switch'],
			cycleEdges: new Map(),
		};

		const ctx = createBuildContext(graph);
		const result = buildSwitchCaseComposite(switchNode, ctx);

		expect(result.kind).toBe('switchCase');
		// Should preserve the actual case indices (0, 3)
		expect(result.caseIndices).toEqual([0, 3]);
	});
});
