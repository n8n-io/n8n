/**
 * Tests for layout utility functions (BFS and Dagre)
 */

import { GRID_SIZE, STICKY_NODE_TYPE, NODE_SPACING_X, START_X, DEFAULT_Y } from './constants';
import {
	calculateNodePositions,
	calculateNodePositionsDagre,
	getNodeDimensions,
} from './layout-utils';
import { workflow } from '../workflow-builder';
import { node, sticky } from './node-builders/node-builder';
import type { GraphNode, ConnectionTarget } from '../types/base';

// Helper to create connection targets
function makeTarget(node: string, type: string = 'main', index: number = 0): ConnectionTarget {
	return { node, type, index };
}

// Helper to create a minimal GraphNode for testing
function createGraphNode(
	name: string,
	type: string,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map([
		['main', new Map<number, ConnectionTarget[]>()],
	]),
	position?: [number, number],
	parameters?: Record<string, unknown>,
): GraphNode {
	const config: Record<string, unknown> = {};
	if (position) config.position = position;
	if (parameters) config.parameters = parameters;
	return {
		instance: {
			type,
			name,
			version: 1,
			config,
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

// ===========================================================================
// BFS Layout Tests (calculateNodePositions)
// ===========================================================================

describe('calculateNodePositions (BFS)', () => {
	it('returns empty map for empty nodes', () => {
		const nodes = new Map<string, GraphNode>();
		const { positions } = calculateNodePositions(nodes);
		expect(positions.size).toBe(0);
	});

	it('positions a single root node at START_X, DEFAULT_Y', () => {
		const nodes = new Map<string, GraphNode>();
		nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

		const { positions } = calculateNodePositions(nodes);

		expect(positions.get('trigger')).toEqual([START_X, DEFAULT_Y]);
	});

	it('positions connected nodes left-to-right with NODE_SPACING_X', () => {
		const nodes = new Map<string, GraphNode>();
		const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

		nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns));
		nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

		const { positions } = calculateNodePositions(nodes);

		expect(positions.get('trigger')).toEqual([START_X, DEFAULT_Y]);
		expect(positions.get('set')).toEqual([START_X + NODE_SPACING_X, DEFAULT_Y]);
	});

	it('positions branches with Y offset', () => {
		const nodes = new Map<string, GraphNode>();
		const ifConns = makeMainConns([
			[0, [makeTarget('trueBranch')]],
			[1, [makeTarget('falseBranch')]],
		]);

		nodes.set('if', createGraphNode('if', 'n8n-nodes-base.if', ifConns));
		nodes.set('trueBranch', createGraphNode('trueBranch', 'n8n-nodes-base.set'));
		nodes.set('falseBranch', createGraphNode('falseBranch', 'n8n-nodes-base.set'));

		const { positions } = calculateNodePositions(nodes);

		const ifPos = positions.get('if')!;
		const truePos = positions.get('trueBranch')!;
		const falsePos = positions.get('falseBranch')!;

		// Both to the right
		expect(truePos[0]).toBeGreaterThan(ifPos[0]);
		expect(falsePos[0]).toBeGreaterThan(ifPos[0]);

		// Different Y
		expect(truePos[1]).not.toBe(falsePos[1]);
	});

	it('skips nodes with explicit positions', () => {
		const nodes = new Map<string, GraphNode>();
		nodes.set(
			'trigger',
			createGraphNode(
				'trigger',
				'n8n-nodes-base.manualTrigger',
				new Map([['main', new Map<number, ConnectionTarget[]>()]]),
				[500, 600],
			),
		);

		const { positions } = calculateNodePositions(nodes);
		expect(positions.has('trigger')).toBe(false);
	});
});

// ===========================================================================
// Dagre Layout Tests (calculateNodePositionsDagre)
// ===========================================================================

describe('calculateNodePositionsDagre', () => {
	describe('basic functionality', () => {
		it('returns empty map for empty nodes', () => {
			const nodes = new Map<string, GraphNode>();
			const { positions } = calculateNodePositionsDagre(nodes);
			expect(positions.size).toBe(0);
		});

		it('positions a single node', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

			const { positions } = calculateNodePositionsDagre(nodes);

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

			const { positions } = calculateNodePositionsDagre(nodes);

			const triggerPos = positions.get('trigger')!;
			const setPos = positions.get('set')!;
			expect(setPos[0]).toBeGreaterThan(triggerPos[0]);
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

			const { positions } = calculateNodePositionsDagre(nodes);

			const posA = positions.get('A')!;
			const posB = positions.get('B')!;
			const posC = positions.get('C')!;
			const posD = positions.get('D')!;

			expect(posB[0]).toBeGreaterThan(posA[0]);
			expect(posC[0]).toBeGreaterThan(posB[0]);
			expect(posD[0]).toBeGreaterThan(posC[0]);

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

			const { positions } = calculateNodePositionsDagre(nodes);

			const ifPos = positions.get('if')!;
			const truePos = positions.get('trueBranch')!;
			const falsePos = positions.get('falseBranch')!;

			expect(truePos[0]).toBeGreaterThan(ifPos[0]);
			expect(falsePos[0]).toBeGreaterThan(ifPos[0]);
			expect(truePos[0]).toBe(falsePos[0]);
			expect(truePos[1]).not.toBe(falsePos[1]);
		});
	});

	describe('disconnected subgraphs', () => {
		it('arranges disconnected components vertically', () => {
			const nodes = new Map<string, GraphNode>();
			const aConns = makeMainConns([[0, [makeTarget('B')]]]);
			const cConns = makeMainConns([[0, [makeTarget('D')]]]);

			nodes.set('A', createGraphNode('A', 'n8n-nodes-base.manualTrigger', aConns));
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.scheduleTrigger', cConns));
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const { positions } = calculateNodePositionsDagre(nodes);

			expect(positions.size).toBe(4);

			for (const pos of positions.values()) {
				expect(isGridAligned(pos)).toBe(true);
			}
		});
	});

	describe('AI workflow', () => {
		it('positions AI subnodes below parent node', () => {
			const nodes = new Map<string, GraphNode>();

			const triggerConns = makeMainConns([[0, [makeTarget('Agent')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('Agent', createGraphNode('Agent', '@n8n/n8n-nodes-langchain.agent'));
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

			const { positions } = calculateNodePositionsDagre(nodes);

			const triggerPos = positions.get('trigger')!;
			const agentPos = positions.get('Agent')!;
			const modelPos = positions.get('OpenAI Model')!;
			const calcPos = positions.get('Calculator')!;

			expect(agentPos[0]).toBeGreaterThan(triggerPos[0]);
			expect(modelPos[1]).toBeGreaterThanOrEqual(agentPos[1]);
			expect(calcPos[1]).toBeGreaterThanOrEqual(agentPos[1]);

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
					new Map([['main', new Map<number, ConnectionTarget[]>()]]),
					[500, 600],
				),
			);

			const { positions } = calculateNodePositionsDagre(nodes);
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

			const { positions } = calculateNodePositionsDagre(nodes);

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

			const { positions } = calculateNodePositionsDagre(nodes);

			for (const [, pos] of positions) {
				expect(pos[0] % GRID_SIZE).toBe(0);
				expect(pos[1] % GRID_SIZE).toBe(0);
			}
		});
	});

	describe('sticky notes', () => {
		it('excludes sticky notes from dagre graph but repositions covered ones', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));
			// Sticky note wraps the trigger and set group (default 240x160 covers them at origin)
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE));

			const { positions } = calculateNodePositionsDagre(nodes);

			// Non-sticky nodes get positions from dagre layout
			expect(positions.has('trigger')).toBe(true);
			expect(positions.has('set')).toBe(true);

			// Sticky note is NOT in the dagre graph but gets repositioned
			// to follow the nodes it covered
			expect(positions.has('note')).toBe(true);
		});

		it('preserves explicit positions and anchors new nodes around them', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const { positions } = calculateNodePositionsDagre(nodes);

			// Explicit position is not overwritten (function only returns positions for unpositioned nodes)
			expect(positions.has('trigger')).toBe(false);
			// New node gets a position from dagre
			expect(positions.has('set')).toBe(true);
		});

		it('reanchors sticky notes using explicit positions of covered nodes', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));
			// Sticky overlapping the explicitly positioned trigger.
			// Sticky uses default 240x160 dimensions so it wraps the 96x96 trigger.
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE, undefined, [500, 600]));

			const { positions } = calculateNodePositionsDagre(nodes);

			// Sticky is reanchored relative to trigger's explicit position, not dagre's guess
			expect(positions.get('note')).toEqual([432, 608]);
		});

		it('repositions multiple stickies wrapping different node groups to distinct positions', () => {
			const a1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'A1' },
			});
			const a2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A2' } });
			const b1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'B1' },
			});
			const b2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'B2' } });

			const wf = workflow('wf', 'wf')
				.add(a1.to(a2))
				.add(b1.to(b2))
				.add(sticky('## Group A', [a1, a2], { name: 'Note A' }))
				.add(sticky('## Group B', [b1, b2], { name: 'Note B' }));

			const json = wf.toJSON({ tidyUp: true });
			const stickies = json.nodes.filter((n) => n.type === STICKY_NODE_TYPE);

			expect(stickies).toHaveLength(2);
			expect(stickies[0].position).not.toEqual(stickies[1].position);
		});

		it('preserves explicit position and dimensions when sticky wraps nodes', () => {
			const a1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'A1' },
			});
			const a2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A2' } });

			const wf = workflow('wf', 'wf')
				.add(a1.to(a2))
				.add(
					sticky('## Manual', [a1, a2], {
						name: 'Pinned',
						position: [800, 400],
						width: 500,
						height: 300,
					}),
				);

			const json = wf.toJSON({ tidyUp: true });
			const note = json.nodes.find((n) => n.name === 'Pinned')!;

			expect(note.position).toEqual([800, 400]);
			expect(note.parameters?.width).toBe(500);
			expect(note.parameters?.height).toBe(300);
		});

		it('repositions stickies correctly after regenerateNodeIds reshuffles ids', () => {
			// The AI builder calls regenerateNodeIds after parsing user code, which
			// rewrites every node's id. Wrapped-node tracking has to survive that —
			// otherwise stickies stack at their pre-layout placeholder coordinates.
			const a1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'A1' },
			});
			const a2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A2' } });
			const b1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'B1' },
			});
			const b2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'B2' } });

			const wf = workflow('wf', 'wf')
				.add(a1.to(a2))
				.add(b1.to(b2))
				.add(sticky('## Group A', [a1, a2], { name: 'Note A' }))
				.add(sticky('## Group B', [b1, b2], { name: 'Note B' }));

			wf.regenerateNodeIds();

			const json = wf.toJSON({ tidyUp: true });
			const stickies = json.nodes.filter((n) => n.type === STICKY_NODE_TYPE);

			expect(stickies).toHaveLength(2);
			expect(stickies[0].position).not.toEqual(stickies[1].position);
		});

		it('grows auto-sized stickies to fit longer text content', () => {
			const short = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Short' },
			});
			const long = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Long' },
			});

			const wf = workflow('wf', 'wf')
				.add(short)
				.add(long)
				.add(sticky('## Short', [short], { name: 'NoteShort' }))
				.add(
					sticky(
						'## Detailed walkthrough\n\nThis sticky has multiple lines of body text that should make it taller than the short one, and a longer heading that should also widen it.',
						[long],
						{ name: 'NoteLong' },
					),
				);

			const json = wf.toJSON({ tidyUp: true });
			const noteShort = json.nodes.find((n) => n.name === 'NoteShort')!;
			const noteLong = json.nodes.find((n) => n.name === 'NoteLong')!;

			expect(Number(noteLong.parameters?.height)).toBeGreaterThan(
				Number(noteShort.parameters?.height),
			);
			expect(Number(noteLong.parameters?.width)).toBeGreaterThan(
				Number(noteShort.parameters?.width),
			);
		});

		it('preserves a caller-set position while still auto-sizing width and height', () => {
			const a1 = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'A1' },
			});
			const a2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'A2' } });

			const wf = workflow('wf', 'wf')
				.add(a1.to(a2))
				.add(
					sticky('## Pinned group', [a1, a2], {
						name: 'Pinned',
						position: [800, 400],
					}),
				);

			const json = wf.toJSON({ tidyUp: true });
			const note = json.nodes.find((n) => n.name === 'Pinned')!;

			expect(note.position).toEqual([800, 400]);
			// width and height should still be auto-derived, not n8n defaults
			expect(Number(note.parameters?.width)).toBeGreaterThanOrEqual(240);
			expect(Number(note.parameters?.height)).toBeGreaterThanOrEqual(160);
		});

		it('auto-fills height when a standalone sticky sets width but not height', () => {
			// Standalone intro-style sticky: no wrapped nodes, caller pins width
			// only. Without auto-fill the body would clip under n8n's default
			// 160px height.
			const intro = sticky(
				'# Intro\n\nLine one of body.\nLine two.\nLine three.\nLine four.\nLine five.',
				{ position: [-400, -200], width: 360, name: 'Intro' },
			);
			const t = node({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Trig' },
			});

			const wf = workflow('wf', 'wf').add(t).add(intro);
			const json = wf.toJSON({ tidyUp: true });
			const note = json.nodes.find((n) => n.name === 'Intro')!;

			expect(note.position).toEqual([-400, -200]);
			expect(note.parameters?.width).toBe(360);
			// Height auto-filled — should be tall enough for ~7 lines of content.
			expect(Number(note.parameters?.height)).toBeGreaterThan(160);
		});
	});

	describe('getNodeDimensions', () => {
		const empty = new Set<string>();

		it('returns parameters.width/height for sticky notes', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'note',
				createGraphNode('note', STICKY_NODE_TYPE, undefined, undefined, {
					content: '## Test',
					width: 400,
					height: 300,
				}),
			);

			expect(getNodeDimensions('note', empty, empty, nodes)).toEqual({
				width: 400,
				height: 300,
			});
		});

		it('falls back to StickyNote node defaults (240x160) when dimensions are absent', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE));

			expect(getNodeDimensions('note', empty, empty, nodes)).toEqual({
				width: 240,
				height: 160,
			});
		});
	});
});
