import { describe, it, expect } from 'vitest';
import { collapseGroup, expandGroup } from './expand';
import type { CanvasNode, CanvasState, GroupNode, NodeId, StandardNode } from './types';
import { isGroupNode } from './types';

// Two stacked copies of the same A → {B path, G(6), D path} → Z structure,
// ported from the n8n-groups-proto `triplePath` fixture. All standard nodes
// are 100×100; the group is 400×100 collapsed.
//
// G expands to 740×220 (children wrapped + 20px padding), so it grows 340 wide
// and 120 tall. Right-pushed nodes shift 340 + 20 = 360; down-pushed nodes
// shift 120 + 20 = 140.
function std(id: string, x: number, y: number): StandardNode {
	return { id, type: 'standard', position: { x, y }, size: { width: 100, height: 100 } };
}

function group(id: string, x: number, y: number, childIds: string[]): GroupNode {
	return {
		id,
		type: 'group',
		position: { x, y },
		size: { width: 400, height: 100 },
		expanded: false,
		collapsedSize: { width: 400, height: 100 },
		childIds,
	};
}

function triplePathFixture(): CanvasState {
	const nodes = new Map<NodeId, CanvasNode>();
	const add = (n: CanvasNode) => nodes.set(n.id, n);

	// --- Upper flow ---
	add(std('a', 0, 240));
	add(std('b1', 200, 80));
	add(std('b2', 350, 80));
	add(std('b3', 500, 80));
	add(group('g', 200, 240, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']));
	add(std('g1', 220, 340));
	add(std('g2', 340, 340));
	add(std('g3', 460, 340));
	add(std('g4', 580, 340));
	add(std('g5', 700, 340));
	add(std('g6', 820, 340));
	add(std('d1', 200, 440));
	add(std('d2', 350, 440));
	add(std('d3', 920, 440));
	add(std('z', 800, 240));
	add(std('y', 945, 240));

	// --- Lower flow (identical structure, shifted down by 500) ---
	add(std('la', 0, 740));
	add(std('lb1', 200, 600));
	add(std('lb2', 350, 600));
	add(std('lb3', 500, 600));
	add(group('lg', 200, 740, ['lg1', 'lg2', 'lg3', 'lg4', 'lg5', 'lg6']));
	add(std('lg1', 220, 840));
	add(std('lg2', 340, 840));
	add(std('lg3', 460, 840));
	add(std('lg4', 580, 840));
	add(std('lg5', 700, 840));
	add(std('lg6', 820, 840));
	add(std('ld1', 200, 940));
	add(std('ld2', 350, 940));
	add(std('ld3', 920, 940));
	add(std('lz', 800, 740));
	add(std('ly', 945, 740));

	return { nodes };
}

function pos(state: CanvasState, id: string) {
	const node = state.nodes.get(id);
	if (!node) throw new Error(`missing ${id}`);
	return node.position;
}

describe('group layout — expand', () => {
	it('group top-left does NOT move on expand (anchor invariant)', () => {
		const before = pos(triplePathFixture(), 'g');
		const after = pos(expandGroup(triplePathFixture(), 'g'), 'g');
		expect(after).toEqual(before);
	});

	it('sibling y-order preserved for {b1, g, d1} across expand', () => {
		const before = triplePathFixture();
		const after = expandGroup(triplePathFixture(), 'g');
		const ids = ['b1', 'g', 'd1'] as const;
		for (let i = 0; i < ids.length; i++) {
			for (let j = i + 1; j < ids.length; j++) {
				const a = ids[i];
				const b = ids[j];
				const signBefore = Math.sign(pos(before, a).y - pos(before, b).y);
				const signAfter = Math.sign(pos(after, a).y - pos(after, b).y);
				expect(signAfter, `pair (${a}, ${b})`).toBe(signBefore);
			}
		}
	});

	it('d1 + d2 pushed down, d3 pushed right (direction divergence)', () => {
		const before = triplePathFixture();
		const after = expandGroup(triplePathFixture(), 'g');
		for (const id of ['d1', 'd2'] as const) {
			expect(pos(after, id).y - pos(before, id).y, `${id} y-delta`).toBeGreaterThan(0);
			expect(pos(after, id).x - pos(before, id).x, `${id} x-delta`).toBe(0);
		}
		expect(pos(after, 'd3').x - pos(before, 'd3').x, 'd3 x-delta').toBeGreaterThan(0);
		expect(pos(after, 'd3').y - pos(before, 'd3').y, 'd3 y-delta').toBe(0);
	});

	it('z moves right, a + b path stay put', () => {
		const before = triplePathFixture();
		const after = expandGroup(triplePathFixture(), 'g');
		expect(pos(after, 'z').x - pos(before, 'z').x, 'z x-delta').toBeGreaterThan(0);
		expect(pos(after, 'z').y - pos(before, 'z').y, 'z y-delta').toBe(0);
		for (const id of ['a', 'b1', 'b2', 'b3'] as const) {
			expect(pos(after, id), `${id} should not move`).toEqual(pos(before, id));
		}
	});

	it('push magnitudes equal expansion growth + offset on the chosen axis', () => {
		const before = triplePathFixture();
		const after = expandGroup(triplePathFixture(), 'g');
		const delta = (id: string) => ({
			dx: pos(after, id).x - pos(before, id).x,
			dy: pos(after, id).y - pos(before, id).y,
		});
		expect(delta('d1')).toEqual({ dx: 0, dy: 140 });
		expect(delta('d2')).toEqual({ dx: 0, dy: 140 });
		expect(delta('d3')).toEqual({ dx: 360, dy: 0 });
		expect(delta('z')).toEqual({ dx: 360, dy: 0 });
	});
});

describe('group layout — collapse', () => {
	it('round-trips positions exactly with no user drags', () => {
		const initial = triplePathFixture();
		const collapsed = collapseGroup(expandGroup(initial, 'g'), 'g');
		for (const [id, node] of initial.nodes) {
			expect(pos(collapsed, id), `${id} after collapse`).toEqual(node.position);
		}
		const g = collapsed.nodes.get('g');
		expect(g && isGroupNode(g) ? g.expanded : true).toBe(false);
	});

	it('preserves user drags performed while expanded', () => {
		const initial = triplePathFixture();
		const expanded = expandGroup(initial, 'g');
		// z was pushed right 360; simulate a user dragging it a further (+50, +30).
		const zExpanded = expanded.nodes.get('z');
		if (!zExpanded) throw new Error('missing z');
		const dragged: CanvasState = {
			nodes: new Map(expanded.nodes).set('z', {
				...zExpanded,
				position: { x: zExpanded.position.x + 50, y: zExpanded.position.y + 30 },
			}),
		};
		const collapsed = collapseGroup(dragged, 'g');
		const zOriginal = pos(initial, 'z');
		expect(pos(collapsed, 'z')).toEqual({ x: zOriginal.x + 50, y: zOriginal.y + 30 });
	});

	it('leaves a pushed node alone if dragged sideways out of trigger footprint', () => {
		const initial = triplePathFixture();
		const expanded = expandGroup(initial, 'g');
		const d1Expanded = expanded.nodes.get('d1');
		if (!d1Expanded) throw new Error('missing d1');
		const dragged: CanvasState = {
			nodes: new Map(expanded.nodes).set('d1', {
				...d1Expanded,
				position: { x: 0, y: d1Expanded.position.y },
			}),
		};
		const collapsed = collapseGroup(dragged, 'g');
		expect(pos(collapsed, 'd1')).toEqual({ x: 0, y: d1Expanded.position.y });
	});

	it('pushes a user-dragged node out of a returning group', () => {
		const initial = triplePathFixture();
		const expanded = expandGroup(initial, 'g');
		// lb3 was not cascaded. User drags it inline with the cascaded lb1/lb2
		// row; on collapse, lg returns up 140 and lb3 follows it.
		const lb3Expanded = expanded.nodes.get('lb3');
		if (!lb3Expanded) throw new Error('missing lb3');
		const dragged: CanvasState = {
			nodes: new Map(expanded.nodes).set('lb3', {
				...lb3Expanded,
				position: { x: lb3Expanded.position.x, y: 740 },
			}),
		};
		const collapsed = collapseGroup(dragged, 'g');
		expect(pos(collapsed, 'lb3')).toEqual({ x: 500, y: 600 });
	});
});
