import { describe, it, expect } from 'vitest';
import { computed, ref } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import { useCanvasGroupCollapse } from './useCanvasGroupCollapse';
import type { Rect } from './computeDisplacements';

function makeRectStore(initial: Record<string, Rect>) {
	const rects = new Map<string, Rect>(Object.entries(initial));
	return {
		set(id: string, rect: Rect) {
			rects.set(id, rect);
		},
		delete(id: string) {
			rects.delete(id);
		},
		get(id: string) {
			return rects.get(id);
		},
		ids() {
			return Array.from(rects.keys());
		},
	};
}

function setup(options: {
	groups: IWorkflowGroup[];
	rects: Record<string, Rect>;
}) {
	const groupsRef = ref<IWorkflowGroup[]>(options.groups);
	const rects = makeRectStore(options.rects);

	const composable = useCanvasGroupCollapse({
		allGroups: computed(() => groupsRef.value),
		allNodeIds: computed(() => rects.ids()),
		getCanonicalNodeRect: (id) => rects.get(id),
	});

	return { composable, groupsRef, rects };
}

describe('useCanvasGroupCollapse', () => {
	describe('initial state', () => {
		it('has no collapsed groups and zero offsets', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: { n1: { x: 0, y: 0, width: 50, height: 50 } },
			});
			expect(composable.isCollapsed('g1')).toBe(false);
			expect(composable.isNodeHidden('n1')).toBe(false);
			expect(composable.getRenderedOffset('n1')).toEqual({ dx: 0, dy: 0 });
		});
	});

	describe('collapse', () => {
		it('marks the group as collapsed and hides its members', () => {
			const { composable } = setup({
				groups: [
					{ id: 'g1', name: 'G1', nodeIds: ['n1', 'n2'] },
					{ id: 'g2', name: 'G2', nodeIds: ['n3'] },
				],
				rects: {
					n1: { x: 0, y: 0, width: 50, height: 50 },
					n2: { x: 0, y: 60, width: 50, height: 50 },
					n3: { x: 0, y: 200, width: 50, height: 50 },
				},
			});
			composable.collapse('g1');
			expect(composable.isCollapsed('g1')).toBe(true);
			expect(composable.isNodeHidden('n1')).toBe(true);
			expect(composable.isNodeHidden('n2')).toBe(true);
			expect(composable.isNodeHidden('n3')).toBe(false);
		});

		it('does nothing if the group is already collapsed', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: { n1: { x: 0, y: 0, width: 50, height: 50 } },
			});
			composable.collapse('g1');
			composable.collapse('g1');
			expect(composable.isCollapsed('g1')).toBe(true);
		});

		it('does not record offsets for surrounding nodes', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					external: { x: 200, y: 200, width: 50, height: 50 },
				},
			});
			composable.collapse('g1');
			expect(composable.getRenderedOffset('external')).toEqual({ dx: 0, dy: 0 });
		});
	});

	describe('expand', () => {
		it('clears the collapsed flag without offsets when the freed space is empty', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					external: { x: 500, y: 500, width: 50, height: 50 },
				},
			});
			composable.collapse('g1');
			composable.expand('g1');
			expect(composable.isCollapsed('g1')).toBe(false);
			expect(composable.getRenderedOffset('external')).toEqual({ dx: 0, dy: 0 });
		});

		it('pushes a node that has moved into the freed space', () => {
			const { composable, rects } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					external: { x: 500, y: 500, width: 50, height: 50 },
				},
			});
			composable.collapse('g1');
			rects.set('external', { x: 10, y: 80, width: 50, height: 50 });
			composable.expand('g1');
			const offset = composable.getRenderedOffset('external');
			expect(offset.dx === 0 || offset.dy === 0).toBe(true);
			expect(offset.dx + offset.dy).toBeGreaterThan(0);
		});

		it('does nothing if the group is not collapsed', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: { n1: { x: 0, y: 0, width: 100, height: 100 } },
			});
			composable.expand('g1');
			expect(composable.isCollapsed('g1')).toBe(false);
		});

		it('cleans up state when expanding a group that no longer exists', () => {
			const { composable, groupsRef } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: { n1: { x: 0, y: 0, width: 100, height: 100 } },
			});
			composable.collapse('g1');
			groupsRef.value = [];
			composable.expand('g1');
			expect(composable.isCollapsed('g1')).toBe(false);
		});
	});

	describe('round trips', () => {
		it('returns to canonical after collapse → expand when nothing changes', () => {
			const { composable } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					external: { x: 200, y: 200, width: 50, height: 50 },
				},
			});
			composable.toggle('g1');
			composable.toggle('g1');
			expect(composable.getRenderedOffset('external')).toEqual({ dx: 0, dy: 0 });
		});

		it('reverses pushed offsets when the group is re-collapsed', () => {
			const { composable, rects } = setup({
				groups: [{ id: 'g1', name: 'G1', nodeIds: ['n1'] }],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					external: { x: 500, y: 500, width: 50, height: 50 },
				},
			});
			composable.collapse('g1');
			rects.set('external', { x: 10, y: 80, width: 50, height: 50 });
			composable.expand('g1');
			const pushed = composable.getRenderedOffset('external');
			expect(pushed.dx + pushed.dy).toBeGreaterThan(0);
			composable.collapse('g1');
			expect(composable.getRenderedOffset('external')).toEqual({ dx: 0, dy: 0 });
		});

		it('keeps offsets additive across two simultaneously expanded groups', () => {
			const { composable, rects } = setup({
				groups: [
					{ id: 'g1', name: 'G1', nodeIds: ['m1'] },
					{ id: 'g2', name: 'G2', nodeIds: ['m2'] },
				],
				rects: {
					m1: { x: 0, y: 0, width: 100, height: 100 },
					m2: { x: 0, y: 1000, width: 100, height: 100 },
					external: { x: 5000, y: 5000, width: 50, height: 50 },
				},
			});

			composable.collapse('g1');
			composable.collapse('g2');

			rects.set('external', { x: 10, y: 50, width: 50, height: 50 });
			composable.expand('g1');
			const afterG1 = composable.getRenderedOffset('external');
			expect(afterG1.dy).toBeGreaterThan(0);

			rects.set('external', { x: 10, y: 1000, width: 50, height: 50 });
			composable.expand('g2');
			const afterBoth = composable.getRenderedOffset('external');
			expect(afterBoth.dy).toBeGreaterThan(afterG1.dy);

			composable.collapse('g1');
			expect(composable.getRenderedOffset('external').dy).toBeGreaterThan(0);
			composable.collapse('g2');
			expect(composable.getRenderedOffset('external')).toEqual({ dx: 0, dy: 0 });
		});
	});

	describe('chip rect tracks offsets and canonical positions', () => {
		it('moves with the group offset when another group expands and pushes it', () => {
			const { composable } = setup({
				groups: [
					{ id: 'g1', name: 'G1', nodeIds: ['n1'] },
					{ id: 'g2', name: 'G2', nodeIds: ['m1'] },
				],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					m1: { x: 0, y: 200, width: 100, height: 100 },
				},
			});
			composable.collapse('g1');
			composable.collapse('g2');
			const before = composable.getCollapsedBoxRect('g2');
			expect(before).toBeDefined();

			composable.expand('g1');

			const after = composable.getCollapsedBoxRect('g2');
			expect(after).toBeDefined();
			expect(after?.y).toBeGreaterThan(before?.y ?? 0);
		});

		it('returns to the canonical position when the pushing group is collapsed again', () => {
			const { composable } = setup({
				groups: [
					{ id: 'g1', name: 'G1', nodeIds: ['n1'] },
					{ id: 'g2', name: 'G2', nodeIds: ['m1'] },
				],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					m1: { x: 0, y: 200, width: 100, height: 100 },
				},
			});
			composable.collapse('g1');
			composable.collapse('g2');
			const before = composable.getCollapsedBoxRect('g2');
			composable.expand('g1');
			composable.collapse('g1');
			const after = composable.getCollapsedBoxRect('g2');
			expect(after?.x).toBe(before?.x);
			expect(after?.y).toBe(before?.y);
		});
	});

	describe('group-aware displacement', () => {
		it('broadcasts the source group push onto every member of an overlapped neighbor group', () => {
			const { composable, rects } = setup({
				groups: [
					{ id: 'g1', name: 'G1', nodeIds: ['n1'] },
					{ id: 'g2', name: 'G2', nodeIds: ['m1', 'm2'] },
				],
				rects: {
					n1: { x: 0, y: 0, width: 100, height: 100 },
					m1: { x: 500, y: 500, width: 50, height: 50 },
					m2: { x: 580, y: 500, width: 50, height: 50 },
				},
			});

			composable.collapse('g1');
			rects.set('m1', { x: 10, y: 80, width: 50, height: 50 });
			rects.set('m2', { x: 70, y: 80, width: 50, height: 50 });
			composable.expand('g1');

			const m1 = composable.getRenderedOffset('m1');
			const m2 = composable.getRenderedOffset('m2');
			expect(m1).toEqual(m2);
			expect(m1.dy).toBeGreaterThan(0);
		});
	});
});
