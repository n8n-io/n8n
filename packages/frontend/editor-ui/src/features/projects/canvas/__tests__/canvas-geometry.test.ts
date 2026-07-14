import { describe, it, expect } from 'vitest';

import {
	autoLayout,
	CLEARANCE,
	forceLayout,
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
		expect(resolveDropOutcome({ target: 'f1' })).toEqual({
			kind: 'file',
			folderId: 'f1',
		});
	});

	it('repositions in place when not dropped onto another folder', () => {
		// covers empty canvas and the workflow's own (possibly stretched) container —
		// the workflow keeps its folder; moving to root is a context-menu action
		expect(resolveDropOutcome({ target: null })).toEqual({ kind: 'reposition' });
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

	it('stacks multiple tools directly below their caller', () => {
		const positions = autoLayout(
			['caller', 't1', 't2', 't3'],
			[toolEdge('caller', 't1'), toolEdge('caller', 't2'), toolEdge('caller', 't3')],
		);
		const caller = positions.get('caller')!;
		let previousY = caller.y;
		for (const id of ['t1', 't2', 't3']) {
			const p = positions.get(id)!;
			expect(p.x).toBe(caller.x);
			expect(p.y).toBeGreaterThan(previousY);
			previousY = p.y;
		}
	});

	it('keeps a tool below its caller even when another caller’s barycenter would pull it above', () => {
		// col 0: A (top), S (below). col 1: C (triggered by S). T is tool-called by C
		// (primary caller) and also by A — the old barycenter ordering placed T above C.
		const positions = autoLayout(
			['A', 'S', 'C', 'T'],
			[callEdge('S', 'C'), toolEdge('C', 'T'), toolEdge('A', 'T')],
		);
		const c = positions.get('C')!;
		const t = positions.get('T')!;
		expect(t.x).toBe(c.x);
		expect(t.y).toBeGreaterThan(c.y);
	});

	it('hangs tools of tools below the tool that calls them', () => {
		const positions = autoLayout(
			['caller', 'tool', 'subTool'],
			[toolEdge('caller', 'tool'), toolEdge('tool', 'subTool')],
		);
		const tool = positions.get('tool')!;
		const subTool = positions.get('subTool')!;
		expect(tool.y).toBeGreaterThan(positions.get('caller')!.y);
		expect(subTool.x).toBe(tool.x);
		expect(subTool.y).toBeGreaterThan(tool.y);
	});

	it('places units with no edges in a grid below the connected graph', () => {
		const positions = autoLayout(['a', 'b', 'lonely1', 'lonely2'], [callEdge('a', 'b')]);
		const connectedBottom = Math.max(positions.get('a')!.y, positions.get('b')!.y);
		expect(positions.get('lonely1')!.y).toBeGreaterThan(connectedBottom);
		expect(positions.get('lonely2')!.x).toBeGreaterThan(positions.get('lonely1')!.x);
		expect(positions.get('lonely2')!.y).toBe(positions.get('lonely1')!.y);
	});
});

describe('forceLayout', () => {
	const graph = {
		units: ['entry', 'agent', 'sub', 't1', 't2', 't3', 'lonely1', 'lonely2'],
		edges: [
			callEdge('entry', 'agent'),
			callEdge('agent', 'sub'),
			toolEdge('agent', 't1'),
			toolEdge('agent', 't2'),
			toolEdge('agent', 't3'),
		],
	};

	it('is deterministic', () => {
		const a = forceLayout(graph.units, graph.edges);
		const b = forceLayout(graph.units, graph.edges);
		expect([...a.entries()]).toEqual([...b.entries()]);
	});

	it('produces no overlapping units', () => {
		const positions = forceLayout(graph.units, graph.edges);
		const connected = ['entry', 'agent', 'sub', 't1', 't2', 't3'];
		for (let i = 0; i < connected.length; i++) {
			for (let j = i + 1; j < connected.length; j++) {
				const a = positions.get(connected[i])!;
				const b = positions.get(connected[j])!;
				expect(
					rectsOverlap({ ...a, w: NODE.w, h: NODE.h }, { ...b, w: NODE.w, h: NODE.h }, 0),
					`${connected[i]} overlaps ${connected[j]}`,
				).toBe(false);
			}
		}
	});

	it('keeps trigger flow left to right', () => {
		const positions = forceLayout(graph.units, graph.edges);
		expect(positions.get('entry')!.x).toBeLessThan(positions.get('agent')!.x);
		expect(positions.get('agent')!.x).toBeLessThan(positions.get('sub')!.x);
	});

	it('keeps tools strictly below their caller', () => {
		const positions = forceLayout(graph.units, graph.edges);
		const agent = positions.get('agent')!;
		for (const id of ['t1', 't2', 't3']) {
			expect(positions.get(id)!.y, `${id} should hang below agent`).toBeGreaterThan(
				agent.y + NODE.h,
			);
		}
	});

	it('places units with no edges in a grid below the connected graph', () => {
		const positions = forceLayout(graph.units, graph.edges);
		const connectedBottom = Math.max(
			...['entry', 'agent', 'sub', 't1', 't2', 't3'].map((id) => positions.get(id)!.y + NODE.h),
		);
		expect(positions.get('lonely1')!.y).toBeGreaterThan(connectedBottom);
		expect(positions.get('lonely2')!.x).toBeGreaterThan(positions.get('lonely1')!.x);
	});
});
