import { describe, it, expect } from 'vitest';

import {
	autoLayout,
	CLEARANCE,
	NODE,
	rectsOverlap,
	resolveDropOutcome,
	resolveDropTarget,
	resolveLevel,
	separationVector,
} from '../canvas-geometry';
import type { Rect } from '../canvas-geometry';
import type { VisibleEdge } from '../graph-model';

function nodeRect(x: number, y: number): Rect {
	return { x, y, w: NODE.w, h: NODE.h };
}

function callEdge(source: string, target: string): VisibleEdge {
	return { id: `${source}→${target}:calls-workflow`, source, target, type: 'calls-workflow' };
}

function toolEdge(source: string, target: string): VisibleEdge {
	return { id: `${source}→${target}:uses-as-tool`, source, target, type: 'uses-as-tool' };
}

describe('separationVector', () => {
	it('picks the axis of minimal displacement', () => {
		const fixed: Rect = { x: 0, y: 0, w: 100, h: 100 };
		// b slightly to the right — cheapest push is further right
		const b: Rect = { x: 90, y: 10, w: 50, h: 50 };
		const v = separationVector(fixed, b);
		expect(v.x).toBeGreaterThan(0);
		expect(v.y).toBe(0);
	});
});

describe('resolveLevel — overlap resolution convergence', () => {
	it('no unit overlaps the fixed rect after resolve', () => {
		const fixed: Rect = { x: 0, y: 0, w: 600, h: 400 };
		// a dense cluster of units all overlapping the fixed rect and each other
		const units = Array.from({ length: 9 }, (_, i) => ({
			id: `u${i}`,
			rect: nodeRect(50 + (i % 3) * 40, 50 + Math.floor(i / 3) * 30),
		}));

		const displacements = resolveLevel(fixed, units);
		const finalRects = units.map((unit) => {
			const d = displacements.find((x) => x.id === unit.id);
			return {
				id: unit.id,
				rect: {
					...unit.rect,
					x: unit.rect.x + (d?.dx ?? 0),
					y: unit.rect.y + (d?.dy ?? 0),
				},
			};
		});

		for (const { id, rect } of finalRects) {
			expect(rectsOverlap(fixed, rect, CLEARANCE), `unit ${id} still under fixed rect`).toBe(false);
		}
	});

	it('converges without oscillation for units caught between each other', () => {
		const fixed: Rect = { x: 0, y: 0, w: 300, h: 300 };
		// stacked exactly on top of each other — the naive one-per-pass version oscillates here
		const units = Array.from({ length: 6 }, (_, i) => ({ id: `u${i}`, rect: nodeRect(100, 100) }));
		const displacements = resolveLevel(fixed, units);

		const finalRects = units.map((unit) => {
			const d = displacements.find((x) => x.id === unit.id);
			return { ...unit.rect, x: unit.rect.x + (d?.dx ?? 0), y: unit.rect.y + (d?.dy ?? 0) };
		});
		for (const rect of finalRects) {
			expect(rectsOverlap(fixed, rect, CLEARANCE)).toBe(false);
		}
	});

	it('leaves non-overlapping units untouched', () => {
		const fixed: Rect = { x: 0, y: 0, w: 100, h: 100 };
		const far = { id: 'far', rect: nodeRect(1000, 1000) };
		expect(resolveLevel(fixed, [far])).toHaveLength(0);
	});
});

describe('resolveDropTarget', () => {
	const point = { x: 50, y: 50 };

	it('collapsed folder beats an expanded container at the same spot', () => {
		const target = resolveDropTarget(point, [
			{
				id: 'container',
				expanded: true,
				visible: true,
				depth: 0,
				rect: { x: 0, y: 0, w: 500, h: 500 },
			},
			{
				id: 'collapsed',
				expanded: false,
				visible: true,
				depth: 0,
				rect: { x: 0, y: 0, w: 216, h: 80 },
			},
		]);
		expect(target).toBe('collapsed');
	});

	it('deepest expanded container wins', () => {
		const target = resolveDropTarget(point, [
			{
				id: 'outer',
				expanded: true,
				visible: true,
				depth: 0,
				rect: { x: 0, y: 0, w: 500, h: 500 },
			},
			{
				id: 'inner',
				expanded: true,
				visible: true,
				depth: 1,
				rect: { x: 0, y: 0, w: 200, h: 200 },
			},
		]);
		expect(target).toBe('inner');
	});

	it('ignores folders hidden inside collapsed ancestors', () => {
		const target = resolveDropTarget(point, [
			{
				id: 'hidden',
				expanded: false,
				visible: false,
				depth: 1,
				rect: { x: 0, y: 0, w: 216, h: 80 },
			},
		]);
		expect(target).toBeNull();
	});

	it('returns null on empty canvas', () => {
		const target = resolveDropTarget({ x: 9999, y: 9999 }, [
			{ id: 'f', expanded: false, visible: true, depth: 0, rect: { x: 0, y: 0, w: 216, h: 80 } },
		]);
		expect(target).toBeNull();
	});
});

describe('resolveDropOutcome', () => {
	it('files into a valid drop target', () => {
		expect(resolveDropOutcome({ target: 'f1', raw: 'f1', currentFolderId: null })).toEqual({
			kind: 'file',
			folderId: 'f1',
		});
	});

	it('moves to project root when dragged out of a container onto empty canvas', () => {
		expect(resolveDropOutcome({ target: null, raw: null, currentFolderId: 'src' })).toEqual({
			kind: 'move-to-root',
		});
	});

	it('repositions when a root card is dropped onto empty canvas', () => {
		expect(resolveDropOutcome({ target: null, raw: null, currentFolderId: null })).toEqual({
			kind: 'reposition',
		});
	});

	it('repositions when dropped within its own folder', () => {
		// raw resolves to the current folder, so target is null
		expect(resolveDropOutcome({ target: null, raw: 'own', currentFolderId: 'own' })).toEqual({
			kind: 'reposition',
		});
	});
});

describe('autoLayout', () => {
	it('places trigger chains in increasing columns', () => {
		const positions = autoLayout(['a', 'b', 'c'], [callEdge('a', 'b'), callEdge('b', 'c')]);
		expect(positions.get('a')!.x).toBeLessThan(positions.get('b')!.x);
		expect(positions.get('b')!.x).toBeLessThan(positions.get('c')!.x);
	});

	it('puts a tool-only target in its caller’s column, below it', () => {
		const positions = autoLayout(['caller', 'tool'], [toolEdge('caller', 'tool')]);
		expect(positions.get('tool')!.x).toBe(positions.get('caller')!.x);
		expect(positions.get('tool')!.y).toBeGreaterThan(positions.get('caller')!.y);
	});

	it('places units with no edges in a grid below the connected graph', () => {
		const positions = autoLayout(['a', 'b', 'lonely1', 'lonely2'], [callEdge('a', 'b')]);
		const connectedBottom = Math.max(positions.get('a')!.y, positions.get('b')!.y);
		expect(positions.get('lonely1')!.y).toBeGreaterThan(connectedBottom);
		expect(positions.get('lonely2')!.x).toBeGreaterThan(positions.get('lonely1')!.x);
		expect(positions.get('lonely2')!.y).toBe(positions.get('lonely1')!.y);
	});
});
