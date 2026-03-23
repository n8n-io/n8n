/**
 * Tests for layout utility functions
 */

import { NODE_SPACING_X, DEFAULT_Y, START_X } from './constants';
import { calculateNodePositions } from './layout-utils';
import type { GraphNode, ConnectionTarget } from '../types/base';

// Helper to create connection targets with correct type
function makeTarget(node: string, index: number = 0): ConnectionTarget {
	return { node, type: 'main', index };
}

// Helper to create a minimal GraphNode for testing
function createGraphNode(
	name: string,
	type: string,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
	position?: [number, number],
): GraphNode {
	return {
		instance: {
			type,
			name,
			version: 1,
			config: position ? { position } : {},
		} as unknown as GraphNode['instance'],
		connections,
	};
}

// Helper to create main connection map
function makeMainConns(
	outputs: Array<[number, ConnectionTarget[]]>,
): Map<string, Map<number, ConnectionTarget[]>> {
	const result = new Map<string, Map<number, ConnectionTarget[]>>();
	result.set('main', new Map(outputs));
	return result;
}

describe('calculateNodePositions', () => {
	describe('basic functionality', () => {
		it('returns empty map for empty nodes', () => {
			const nodes = new Map<string, GraphNode>();
			const positions = calculateNodePositions(nodes);
			expect(positions.size).toBe(0);
		});

		it('positions single root node at START_X, DEFAULT_Y', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

			const positions = calculateNodePositions(nodes);

			expect(positions.get('trigger')).toEqual([START_X, DEFAULT_Y]);
		});

		it('positions connected node NODE_SPACING_X to the right of source', () => {
			const nodes = new Map<string, GraphNode>();

			// Trigger -> Set
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			expect(positions.get('trigger')).toEqual([START_X, DEFAULT_Y]);
			expect(positions.get('set')).toEqual([START_X + NODE_SPACING_X, DEFAULT_Y]);
		});
	});

	describe('multiple roots', () => {
		it('positions multiple root nodes with Y offset of 150', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('trigger1', createGraphNode('trigger1', 'n8n-nodes-base.manualTrigger'));
			nodes.set('trigger2', createGraphNode('trigger2', 'n8n-nodes-base.scheduleTrigger'));

			const positions = calculateNodePositions(nodes);

			// Both at START_X, different Y
			const pos1 = positions.get('trigger1');
			const pos2 = positions.get('trigger2');

			expect(pos1?.[0]).toBe(START_X);
			expect(pos2?.[0]).toBe(START_X);
			// Y values should differ by 150
			expect(Math.abs((pos1?.[1] ?? 0) - (pos2?.[1] ?? 0))).toBe(150);
		});
	});

	describe('branching', () => {
		it('positions branches with Y offset for each branch', () => {
			const nodes = new Map<string, GraphNode>();

			// IF node with two outputs
			const ifConns = makeMainConns([
				[0, [makeTarget('trueBranch')]],
				[1, [makeTarget('falseBranch')]],
			]);

			nodes.set('if', createGraphNode('if', 'n8n-nodes-base.if', ifConns));
			nodes.set('trueBranch', createGraphNode('trueBranch', 'n8n-nodes-base.set'));
			nodes.set('falseBranch', createGraphNode('falseBranch', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			const ifPos = positions.get('if');
			const truePos = positions.get('trueBranch');
			const falsePos = positions.get('falseBranch');

			// IF at root position
			expect(ifPos).toEqual([START_X, DEFAULT_Y]);

			// Both branches at same X (NODE_SPACING_X from IF)
			expect(truePos?.[0]).toBe(START_X + NODE_SPACING_X);
			expect(falsePos?.[0]).toBe(START_X + NODE_SPACING_X);

			// Different Y positions (offset by 150)
			expect(Math.abs((truePos?.[1] ?? 0) - (falsePos?.[1] ?? 0))).toBe(150);
		});
	});

	describe('explicit positions', () => {
		it('skips nodes that already have explicit position in config', () => {
			const nodes = new Map<string, GraphNode>();

			// Node with explicit position
			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', new Map(), [500, 600]),
			);

			const positions = calculateNodePositions(nodes);

			// Should not include node with explicit position
			expect(positions.has('trigger')).toBe(false);
		});

		it('positions nodes without explicit config but skips those with explicit', () => {
			const nodes = new Map<string, GraphNode>();

			// Trigger has explicit position
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			// Trigger skipped (has explicit position)
			expect(positions.has('trigger')).toBe(false);
			// Set still gets calculated position relative to trigger's BFS position
			expect(positions.has('set')).toBe(true);
		});
	});

	describe('linear chain', () => {
		it('positions chain of nodes incrementing X by NODE_SPACING_X', () => {
			const nodes = new Map<string, GraphNode>();

			// A -> B -> C -> D
			const aConns = makeMainConns([[0, [makeTarget('B')]]]);
			const bConns = makeMainConns([[0, [makeTarget('C')]]]);
			const cConns = makeMainConns([[0, [makeTarget('D')]]]);

			nodes.set('A', createGraphNode('A', 'n8n-nodes-base.manualTrigger', aConns));
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set', bConns));
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.set', cConns));
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			expect(positions.get('A')).toEqual([START_X, DEFAULT_Y]);
			expect(positions.get('B')).toEqual([START_X + NODE_SPACING_X, DEFAULT_Y]);
			expect(positions.get('C')).toEqual([START_X + NODE_SPACING_X * 2, DEFAULT_Y]);
			expect(positions.get('D')).toEqual([START_X + NODE_SPACING_X * 3, DEFAULT_Y]);
		});
	});
});
