import { describe, it, expect } from 'vitest';
import {
	computeCollapseLayout,
	computeExpandLayout,
	type LayoutNode,
	type NodeMove,
} from './index';

function node(id: string, x: number, y: number): LayoutNode {
	return { id, position: { x, y }, size: { width: 100, height: 100 } };
}

function applyMoves(nodes: LayoutNode[], moves: NodeMove[]): LayoutNode[] {
	const byId = new Map(moves.map((m) => [m.id, m.position]));
	return nodes.map((n) => {
		const p = byId.get(n.id);
		return p ? { ...n, position: { ...p } } : n;
	});
}

// A group of two members, a frame that overlaps one external node, plus a far
// node that should never be touched.
const MEMBER_IDS = ['m1', 'm2'];
const COLLAPSED_RECT = { x: 280, y: 160, width: 200, height: 40 };
const EXPANDED_RECT = { x: 280, y: 160, width: 340, height: 200 };

function scene(): LayoutNode[] {
	return [
		node('m1', 300, 200),
		node('m2', 480, 200),
		node('ext', 560, 220), // overlaps the expanded frame (right edge 620)
		node('far', 1200, 1200),
	];
}

describe('group layout adapter', () => {
	it('expand pushes an overlapping external node and leaves far/member nodes alone', () => {
		const { moves } = computeExpandLayout({
			nodes: scene(),
			memberIds: MEMBER_IDS,
			collapsedRect: COLLAPSED_RECT,
			expandedRect: EXPANDED_RECT,
		});

		const movedIds = moves.map((m) => m.id);
		expect(movedIds).toContain('ext');
		expect(movedIds).not.toContain('far');
		expect(movedIds).not.toContain('m1');
		expect(movedIds).not.toContain('m2');

		const ext = moves.find((m) => m.id === 'ext');
		expect(ext?.position.x).toBeGreaterThan(560);
	});

	it('collapse round-trips external positions exactly with no user drags (mandatory invariant)', () => {
		const before = scene();

		const expand = computeExpandLayout({
			nodes: before,
			memberIds: MEMBER_IDS,
			collapsedRect: COLLAPSED_RECT,
			expandedRect: EXPANDED_RECT,
		});
		const expanded = applyMoves(before, expand.moves);

		const collapse = computeCollapseLayout({
			nodes: expanded,
			memberIds: MEMBER_IDS,
			collapsedRect: COLLAPSED_RECT,
			expandedRect: EXPANDED_RECT,
			expandDeltas: expand.expandDeltas,
		});
		const collapsed = applyMoves(expanded, collapse.moves);

		const byId = new Map(collapsed.map((n) => [n.id, n.position]));
		for (const original of before) {
			expect(byId.get(original.id), `${original.id} round-trip`).toEqual(original.position);
		}
	});

	it('collapse keeps a user drag applied while expanded', () => {
		const before = scene();
		const expand = computeExpandLayout({
			nodes: before,
			memberIds: MEMBER_IDS,
			collapsedRect: COLLAPSED_RECT,
			expandedRect: EXPANDED_RECT,
		});
		// Drag ext a further (+40, +0) while expanded.
		const expanded = applyMoves(before, expand.moves).map((n) =>
			n.id === 'ext' ? { ...n, position: { x: n.position.x + 40, y: n.position.y } } : n,
		);

		const collapse = computeCollapseLayout({
			nodes: expanded,
			memberIds: MEMBER_IDS,
			collapsedRect: COLLAPSED_RECT,
			expandedRect: EXPANDED_RECT,
			expandDeltas: expand.expandDeltas,
		});
		const collapsed = applyMoves(expanded, collapse.moves);
		const ext = collapsed.find((n) => n.id === 'ext');
		// Original ext.x was 560; the drag adds 40.
		expect(ext?.position).toEqual({ x: 600, y: 220 });
	});
});
