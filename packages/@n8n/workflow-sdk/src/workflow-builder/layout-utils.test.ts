/**
 * Tests for Dagre-based layout utility functions
 */

import { GRID_SIZE, STICKY_NODE_TYPE } from './constants';
import { calculateNodePositions } from './layout-utils';
import type { GraphNode, ConnectionTarget } from '../types/base';

// Helper to create connection targets
function makeTarget(node: string, type: string = 'main', index: number = 0): ConnectionTarget {
	return { node, type, index };
}

// Helper to create a minimal GraphNode for testing
function createGraphNode(
	name: string,
	type: string,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map([['main', new Map()]]),
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

// Helper to create AI subnode connection map (subnode -> parent via ai_* type)
function makeAiConns(
	parentName: string,
	aiType: string,
	index: number = 0,
): Map<string, Map<number, ConnectionTarget[]>> {
	const result = new Map<string, Map<number, ConnectionTarget[]>>();
	result.set('main', new Map());
	result.set(aiType, new Map([[0, [makeTarget(parentName, aiType, index)]]]));
	return result;
}

function isGridAligned(pos: [number, number]): boolean {
	return pos[0] % GRID_SIZE === 0 && pos[1] % GRID_SIZE === 0;
}

describe('calculateNodePositions', () => {
	describe('basic functionality', () => {
		it('returns empty map for empty nodes', () => {
			const nodes = new Map<string, GraphNode>();
			const positions = calculateNodePositions(nodes);
			expect(positions.size).toBe(0);
		});

		it('positions a single node', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

			const positions = calculateNodePositions(nodes);

			expect(positions.has('trigger')).toBe(true);
			const pos = positions.get('trigger')!;
			expect(isGridAligned(pos)).toBe(true);
		});

		it('positions connected nodes left-to-right', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			const triggerPos = positions.get('trigger')!;
			const setPos = positions.get('set')!;
			// Set should be to the right of trigger
			expect(setPos[0]).toBeGreaterThan(triggerPos[0]);
			// Same Y (roughly)
			expect(Math.abs(setPos[1] - triggerPos[1])).toBeLessThan(GRID_SIZE * 2);
		});
	});

	describe('linear chain', () => {
		it('positions chain of nodes incrementing X', () => {
			const nodes = new Map<string, GraphNode>();
			const aConns = makeMainConns([[0, [makeTarget('B')]]]);
			const bConns = makeMainConns([[0, [makeTarget('C')]]]);
			const cConns = makeMainConns([[0, [makeTarget('D')]]]);

			nodes.set('A', createGraphNode('A', 'n8n-nodes-base.manualTrigger', aConns));
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set', bConns));
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.set', cConns));
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			const posA = positions.get('A')!;
			const posB = positions.get('B')!;
			const posC = positions.get('C')!;
			const posD = positions.get('D')!;

			// Each node should be further right
			expect(posB[0]).toBeGreaterThan(posA[0]);
			expect(posC[0]).toBeGreaterThan(posB[0]);
			expect(posD[0]).toBeGreaterThan(posC[0]);

			// All at same Y
			expect(posA[1]).toBe(posB[1]);
			expect(posB[1]).toBe(posC[1]);
			expect(posC[1]).toBe(posD[1]);
		});
	});

	describe('branching', () => {
		it('positions branches with Y offset', () => {
			const nodes = new Map<string, GraphNode>();
			const ifConns = makeMainConns([
				[0, [makeTarget('trueBranch')]],
				[1, [makeTarget('falseBranch')]],
			]);

			nodes.set('if', createGraphNode('if', 'n8n-nodes-base.if', ifConns));
			nodes.set('trueBranch', createGraphNode('trueBranch', 'n8n-nodes-base.set'));
			nodes.set('falseBranch', createGraphNode('falseBranch', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			const ifPos = positions.get('if')!;
			const truePos = positions.get('trueBranch')!;
			const falsePos = positions.get('falseBranch')!;

			// Both branches to the right of IF
			expect(truePos[0]).toBeGreaterThan(ifPos[0]);
			expect(falsePos[0]).toBeGreaterThan(ifPos[0]);

			// At same X
			expect(truePos[0]).toBe(falsePos[0]);

			// Different Y
			expect(truePos[1]).not.toBe(falsePos[1]);
		});
	});

	describe('disconnected subgraphs', () => {
		it('arranges disconnected components vertically', () => {
			const nodes = new Map<string, GraphNode>();
			const aConns = makeMainConns([[0, [makeTarget('B')]]]);
			const cConns = makeMainConns([[0, [makeTarget('D')]]]);

			// Two independent chains
			nodes.set('A', createGraphNode('A', 'n8n-nodes-base.manualTrigger', aConns));
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.scheduleTrigger', cConns));
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			expect(positions.size).toBe(4);

			// Both chains should exist with all positions grid-aligned
			for (const pos of positions.values()) {
				expect(isGridAligned(pos)).toBe(true);
			}
		});
	});

	describe('AI workflow', () => {
		it('positions AI subnodes below parent node', () => {
			const nodes = new Map<string, GraphNode>();

			// Trigger -> Agent, with Model and Tool connected to Agent via ai_* types
			const triggerConns = makeMainConns([[0, [makeTarget('Agent')]]]);
			const agentConns = makeMainConns([]); // Agent has no main outgoing

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('Agent', createGraphNode('Agent', '@n8n/n8n-nodes-langchain.agent', agentConns));
			nodes.set(
				'OpenAI Model',
				createGraphNode(
					'OpenAI Model',
					'@n8n/n8n-nodes-langchain.lmChatOpenAi',
					makeAiConns('Agent', 'ai_languageModel'),
				),
			);
			nodes.set(
				'Calculator',
				createGraphNode(
					'Calculator',
					'@n8n/n8n-nodes-langchain.toolCalculator',
					makeAiConns('Agent', 'ai_tool'),
				),
			);

			const positions = calculateNodePositions(nodes);

			const triggerPos = positions.get('trigger')!;
			const agentPos = positions.get('Agent')!;
			const modelPos = positions.get('OpenAI Model')!;
			const calcPos = positions.get('Calculator')!;

			// Agent should be to the right of trigger
			expect(agentPos[0]).toBeGreaterThan(triggerPos[0]);

			// Subnodes should be below (or at least not above) the agent
			expect(modelPos[1]).toBeGreaterThanOrEqual(agentPos[1]);
			expect(calcPos[1]).toBeGreaterThanOrEqual(agentPos[1]);

			// All positions grid-aligned
			expect(isGridAligned(triggerPos)).toBe(true);
			expect(isGridAligned(agentPos)).toBe(true);
			expect(isGridAligned(modelPos)).toBe(true);
			expect(isGridAligned(calcPos)).toBe(true);
		});
	});

	describe('explicit positions', () => {
		it('skips nodes that already have explicit position in config', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'trigger',
				createGraphNode(
					'trigger',
					'n8n-nodes-base.manualTrigger',
					new Map([['main', new Map()]]),
					[500, 600],
				),
			);

			const positions = calculateNodePositions(nodes);
			expect(positions.has('trigger')).toBe(false);
		});

		it('positions nodes without explicit config but skips those with explicit', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			expect(positions.has('trigger')).toBe(false);
			expect(positions.has('set')).toBe(true);
		});
	});

	describe('grid alignment', () => {
		it('all positions are multiples of GRID_SIZE', () => {
			const nodes = new Map<string, GraphNode>();
			const aConns = makeMainConns([[0, [makeTarget('B')]]]);
			const bConns = makeMainConns([
				[0, [makeTarget('C')]],
				[1, [makeTarget('D')]],
			]);

			nodes.set('A', createGraphNode('A', 'n8n-nodes-base.manualTrigger', aConns));
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.if', bConns));
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.set'));
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const positions = calculateNodePositions(nodes);

			for (const [, pos] of positions) {
				expect(pos[0] % GRID_SIZE).toBe(0);
				expect(pos[1] % GRID_SIZE).toBe(0);
			}
		});
	});

	describe('sticky notes', () => {
		it('excludes sticky notes from main layout', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));
			// Sticky note behind the trigger and set nodes (covers them at origin)
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE));

			const positions = calculateNodePositions(nodes);

			// Non-sticky nodes get positions from dagre layout
			expect(positions.has('trigger')).toBe(true);
			expect(positions.has('set')).toBe(true);

			// Sticky note is NOT in the dagre graph but gets repositioned
			// to follow the nodes it covered
			expect(positions.has('note')).toBe(true);

			// Sticky note that doesn't cover any nodes is excluded entirely
			const nodes2 = new Map(nodes);
			nodes2.set(
				'remote-note',
				createGraphNode('remote-note', STICKY_NODE_TYPE, undefined, [5000, 5000]),
			);
			const positions2 = calculateNodePositions(nodes2);
			expect(positions2.has('remote-note')).toBe(false);
		});
	});
});
