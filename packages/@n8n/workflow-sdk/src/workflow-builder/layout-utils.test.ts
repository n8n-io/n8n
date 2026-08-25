/**
 * Tests for layout utility functions (BFS and Dagre)
 */

import { GROUP_HEADER_WIDTH_COLLAPSED, computeGroupFrameRects } from 'n8n-workflow';

import {
	GRID_SIZE,
	STICKY_NODE_TYPE,
	NODE_SPACING_X,
	NODE_X_SPACING,
	START_X,
	DEFAULT_Y,
	DEFAULT_NODE_SIZE,
} from './constants';
import {
	calculateNodePositions,
	calculateNodePositionsDagre,
	resolveStickyGeometry,
} from './layout-utils';
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
	return {
		instance: {
			id: name,
			type,
			name,
			version: 1,
			config: {
				...(position ? { position } : {}),
				...(parameters ? { parameters } : {}),
			},
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

function collapsedGroupRect(
	positions: ReadonlyMap<string, [number, number]>,
	memberNames: string[],
): { x: number; y: number; width: number; height: number } {
	const memberBoxes = memberNames.map((name) => {
		const position = positions.get(name);
		if (!position) throw new Error(`Missing position for ${name}`);
		return {
			x: position[0],
			y: position[1],
			width: DEFAULT_NODE_SIZE[0],
			height: DEFAULT_NODE_SIZE[1],
		};
	});
	return collapsedGroupRectFromBoxes(memberBoxes);
}

function collapsedGroupRectFromBoxes(
	boxes: Array<{ x: number; y: number; width: number; height: number }>,
): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	const minX = Math.min(...boxes.map((box) => box.x));
	const minY = Math.min(...boxes.map((box) => box.y));
	const maxX = Math.max(...boxes.map((box) => box.x + box.width));
	const maxY = Math.max(...boxes.map((box) => box.y + box.height));

	return computeGroupFrameRects({
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	}).collapsed;
}

function createAnchoredSticky(name: string, anchorIds: string[]): GraphNode {
	const sticky = createGraphNode(name, STICKY_NODE_TYPE);
	return {
		...sticky,
		instance: {
			...sticky.instance,
			stickyAnchorIds: anchorIds,
		} as GraphNode['instance'],
	};
}

// ===========================================================================
// BFS Layout Tests (calculateNodePositions)
// ===========================================================================

describe('calculateNodePositions (BFS)', () => {
	it('returns empty map for empty nodes', () => {
		const nodes = new Map<string, GraphNode>();
		const positions = calculateNodePositions(nodes);
		expect(positions.size).toBe(0);
	});

	it('positions a single root node at START_X, DEFAULT_Y', () => {
		const nodes = new Map<string, GraphNode>();
		nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

		const positions = calculateNodePositions(nodes);

		expect(positions.get('trigger')).toEqual([START_X, DEFAULT_Y]);
	});

	it('positions connected nodes left-to-right with NODE_SPACING_X', () => {
		const nodes = new Map<string, GraphNode>();
		const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

		nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns));
		nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

		const positions = calculateNodePositions(nodes);

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

		const positions = calculateNodePositions(nodes);

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

		const positions = calculateNodePositions(nodes);
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
			const positions = calculateNodePositionsDagre(nodes);
			expect(positions.size).toBe(0);
		});

		it('positions a single node', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set('trigger', createGraphNode('trigger', 'n8n-nodes-base.manualTrigger'));

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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

		it('handles cycles in AI config references', () => {
			const nodes = new Map<string, GraphNode>();

			nodes.set(
				'Agent',
				createGraphNode(
					'Agent',
					'@n8n/n8n-nodes-langchain.agent',
					makeAiConns('Calculator', 'ai_tool'),
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

			expect(() => calculateNodePositionsDagre(nodes)).not.toThrow();
		});
	});

	describe('node groups', () => {
		it('lays out chained groups as collapsed chips', () => {
			const nodes = new Map<string, GraphNode>();

			nodes.set(
				'Start',
				createGraphNode(
					'Start',
					'n8n-nodes-base.manualTrigger',
					makeMainConns([[0, [makeTarget('Normalize')]]]),
				),
			);
			nodes.set(
				'Normalize',
				createGraphNode(
					'Normalize',
					'n8n-nodes-base.set',
					makeMainConns([[0, [makeTarget('Filter')]]]),
				),
			);
			nodes.set(
				'Filter',
				createGraphNode(
					'Filter',
					'n8n-nodes-base.if',
					makeMainConns([[0, [makeTarget('Format')]]]),
				),
			);
			nodes.set(
				'Format',
				createGraphNode(
					'Format',
					'n8n-nodes-base.set',
					makeMainConns([
						[0, [makeTarget('Slack')]],
						[1, [makeTarget('Gmail')]],
					]),
				),
			);
			nodes.set('Slack', createGraphNode('Slack', 'n8n-nodes-base.slack'));
			nodes.set('Gmail', createGraphNode('Gmail', 'n8n-nodes-base.gmail'));

			const positions = calculateNodePositionsDagre(nodes, [
				{ name: 'Intake', memberKeys: ['Normalize', 'Filter'] },
				{ name: 'Deliver', memberKeys: ['Format', 'Slack', 'Gmail'] },
			]);

			const intakeChip = collapsedGroupRect(positions, ['Normalize', 'Filter']);
			const deliverChip = collapsedGroupRect(positions, ['Format', 'Slack', 'Gmail']);

			expect(deliverChip.y).toBe(intakeChip.y);
			expect(deliverChip.x - intakeChip.x).toBe(GROUP_HEADER_WIDTH_COLLAPSED + NODE_X_SPACING);
		});

		it('lays out AI config nodes inside a group interior', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'Start',
				createGraphNode(
					'Start',
					'n8n-nodes-base.manualTrigger',
					makeMainConns([[0, [makeTarget('Agent')]]]),
				),
			);
			nodes.set(
				'Agent',
				createGraphNode(
					'Agent',
					'@n8n/n8n-nodes-langchain.agent',
					makeMainConns([[0, [makeTarget('Done')]]]),
				),
			);
			nodes.set('Done', createGraphNode('Done', 'n8n-nodes-base.set'));
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

			const positions = calculateNodePositionsDagre(nodes, [
				{ name: 'AI', memberKeys: ['Agent', 'OpenAI Model', 'Calculator'] },
			]);

			const agentPos = positions.get('Agent')!;
			const modelPos = positions.get('OpenAI Model')!;
			const calculatorPos = positions.get('Calculator')!;
			const donePos = positions.get('Done')!;

			expect(modelPos[1]).toBeGreaterThanOrEqual(agentPos[1]);
			expect(calculatorPos[1]).toBeGreaterThanOrEqual(agentPos[1]);
			expect(donePos[0]).toBeGreaterThan(agentPos[0]);
		});

		it('aligns grouped chips when a member sticky wraps the group nodes', () => {
			const nodes = new Map<string, GraphNode>();

			nodes.set(
				'Start',
				createGraphNode(
					'Start',
					'n8n-nodes-base.manualTrigger',
					makeMainConns([[0, [makeTarget('A')]]]),
				),
			);
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set(
				'B',
				createGraphNode('B', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('C')]]])),
			);
			nodes.set(
				'C',
				createGraphNode('C', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('D')]]])),
			);
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));
			nodes.set('Note', createAnchoredSticky('Note', ['A', 'B']));

			const positions = calculateNodePositionsDagre(nodes, [
				{ name: 'With note', memberKeys: ['A', 'B', 'Note'] },
				{ name: 'Plain', memberKeys: ['C', 'D'] },
			]);
			const stickyGeometry = resolveStickyGeometry(nodes, positions);
			const noteGeometry = stickyGeometry.get('Note');
			expect(noteGeometry?.size).toBeDefined();

			const noteBox = {
				x: noteGeometry!.position[0],
				y: noteGeometry!.position[1],
				width: noteGeometry!.size!.width,
				height: noteGeometry!.size!.height,
			};
			const firstChip = collapsedGroupRectFromBoxes([
				...['A', 'B'].map((name) => {
					const position = positions.get(name)!;
					return {
						x: position[0],
						y: position[1],
						width: DEFAULT_NODE_SIZE[0],
						height: DEFAULT_NODE_SIZE[1],
					};
				}),
				noteBox,
			]);
			const secondChip = collapsedGroupRect(positions, ['C', 'D']);

			expect(secondChip.y).toBe(firstChip.y);
			expect(secondChip.x - firstChip.x).toBe(GROUP_HEADER_WIDTH_COLLAPSED + NODE_X_SPACING);
		});

		it('falls back to legacy layout when a group member has an explicit position', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode(
					'A',
					'n8n-nodes-base.set',
					makeMainConns([[0, [makeTarget('B')]]]),
					[500, 600],
				),
			);
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));

			const legacyPositions = calculateNodePositionsDagre(nodes);
			const groupedPositions = calculateNodePositionsDagre(nodes, [
				{ name: 'Positioned', memberKeys: ['A', 'B'] },
			]);

			expect(groupedPositions).toEqual(legacyPositions);
			expect(groupedPositions.has('A')).toBe(false);
		});

		it('skips sticky-only groups', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));
			nodes.set('Note', createGraphNode('Note', STICKY_NODE_TYPE, undefined, [5000, 5000]));

			const legacyPositions = calculateNodePositionsDagre(nodes);
			const groupedPositions = calculateNodePositionsDagre(nodes, [
				{ name: 'Only note', memberKeys: ['Note'] },
			]);

			expect(groupedPositions).toEqual(legacyPositions);
		});

		it('skips groups whose members do not resolve', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));

			const legacyPositions = calculateNodePositionsDagre(nodes);
			const groupedPositions = calculateNodePositionsDagre(nodes, [
				{ name: 'Ghosts', memberKeys: ['Ghost A', 'Ghost B'] },
			]);

			expect(groupedPositions).toEqual(legacyPositions);
		});

		it('falls back for all groups that share a non-sticky member', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set(
				'B',
				createGraphNode('B', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('C')]]])),
			);
			nodes.set('C', createGraphNode('C', 'n8n-nodes-base.set'));

			const legacyPositions = calculateNodePositionsDagre(nodes);
			const groupedPositions = calculateNodePositionsDagre(nodes, [
				{ name: 'First', memberKeys: ['A', 'B'] },
				{ name: 'Second', memberKeys: ['B', 'C'] },
			]);

			expect(groupedPositions).toEqual(legacyPositions);
		});

		it('lets an invalid group bridge otherwise disconnected components through its chip', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set('B', createGraphNode('B', 'n8n-nodes-base.set'));
			nodes.set(
				'C',
				createGraphNode('C', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('D')]]])),
			);
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));

			const positions = calculateNodePositionsDagre(nodes, [
				{ name: 'Bridge', memberKeys: ['B', 'C'] },
			]);

			const chip = collapsedGroupRect(positions, ['B', 'C']);
			expect(positions.get('D')![0]).toBeGreaterThan(chip.x);
			expect(chip.x).toBeGreaterThan(positions.get('A')![0]);
			expect(positions.get('D')![1]).toBe(positions.get('A')![1]);
		});

		it('handles multiple crossing edges around a group chip', () => {
			const nodes = new Map<string, GraphNode>();
			nodes.set(
				'A',
				createGraphNode('A', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set(
				'C',
				createGraphNode('C', 'n8n-nodes-base.set', makeMainConns([[0, [makeTarget('B')]]])),
			);
			nodes.set(
				'B',
				createGraphNode(
					'B',
					'n8n-nodes-base.set',
					makeMainConns([
						[0, [makeTarget('D')]],
						[1, [makeTarget('E')]],
					]),
				),
			);
			nodes.set('D', createGraphNode('D', 'n8n-nodes-base.set'));
			nodes.set('E', createGraphNode('E', 'n8n-nodes-base.set'));

			const positions = calculateNodePositionsDagre(nodes, [
				{ name: 'Many edges', memberKeys: ['B'] },
			]);

			const chip = collapsedGroupRect(positions, ['B']);
			expect(positions.get('B')).toBeDefined();
			expect(positions.get('D')![0]).toBeGreaterThan(chip.x);
			expect(positions.get('E')![0]).toBeGreaterThan(chip.x);
			expect(chip.x).toBeGreaterThan(Math.min(positions.get('A')![0], positions.get('C')![0]));
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

			const positions = calculateNodePositionsDagre(nodes);
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

			const positions = calculateNodePositionsDagre(nodes);

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

			const positions = calculateNodePositionsDagre(nodes);

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
			// Sticky note behind the trigger and set nodes (covers them at origin)
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE));

			const positions = calculateNodePositionsDagre(nodes);

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
			const positions2 = calculateNodePositionsDagre(nodes2);
			expect(positions2.has('remote-note')).toBe(false);
		});

		it('preserves explicit positions and anchors new nodes around them', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));

			const positions = calculateNodePositionsDagre(nodes);

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
			// Sticky overlapping the explicitly positioned trigger
			nodes.set('note', createGraphNode('note', STICKY_NODE_TYPE, undefined, [500, 600]));

			const positions = calculateNodePositionsDagre(nodes);

			// Sticky is reanchored relative to trigger's explicit position, not dagre's guess.
			// Bottom-aligned against the covered node using the sticky's own 240x160 default
			// size — not the node-sized box the layout used to assume for stickies.
			expect(positions.get('note')).toEqual([432, 608]);
		});

		it('measures coverage using the sticky note declared size', () => {
			const nodes = new Map<string, GraphNode>();
			const triggerConns = makeMainConns([[0, [makeTarget('set')]]]);

			nodes.set(
				'trigger',
				createGraphNode('trigger', 'n8n-nodes-base.manualTrigger', triggerConns, [500, 600]),
			);
			nodes.set('set', createGraphNode('set', 'n8n-nodes-base.set'));
			// A wide sticky whose declared box covers the trigger, but whose top-left
			// corner alone does not — only its real width/height reveal the coverage.
			nodes.set(
				'note',
				createGraphNode('note', STICKY_NODE_TYPE, undefined, [480, 560], {
					width: 400,
					height: 300,
				}),
			);

			const positions = calculateNodePositionsDagre(nodes);

			// The sticky covers the trigger, so it follows it instead of being left behind
			const notePosition = positions.get('note');
			expect(notePosition).toBeDefined();
			const [x, y] = notePosition!;
			expect(x).toBeLessThanOrEqual(500);
			expect(x + 400).toBeGreaterThanOrEqual(500 + DEFAULT_NODE_SIZE[0]);
			expect(y).toBeLessThanOrEqual(600);
			expect(y + 300).toBeGreaterThanOrEqual(600 + DEFAULT_NODE_SIZE[1]);
		});
	});
});
