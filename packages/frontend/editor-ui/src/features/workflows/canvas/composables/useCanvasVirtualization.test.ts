import { computed, ref } from 'vue';
import {
	computeCullingFrame,
	isOutsideRect,
	useCanvasVirtualization,
	VIRTUALIZATION_MIN_NODES,
} from './useCanvasVirtualization';

describe(useCanvasVirtualization, () => {
	describe('computeCullingFrame', () => {
		it.each([
			{
				name: 'zoomed in',
				viewport: { x: -100, y: -50, zoom: 2 },
				dimensions: { width: 800, height: 600 },
				expected: { zoom: 2, rect: { x: -150, y: -125, width: 800, height: 600 } },
			},
			{
				name: 'zoomed out',
				viewport: { x: 100, y: 50, zoom: 0.5 },
				dimensions: { width: 800, height: 600 },
				expected: { zoom: 0.5, rect: { x: -1000, y: -700, width: 3200, height: 2400 } },
			},
		])(
			'expands the viewport rect by half a viewport per side ($name)',
			({ viewport, dimensions, expected }) => {
				expect(computeCullingFrame(viewport, dimensions)).toEqual(expected);
			},
		);
	});

	describe('isOutsideRect', () => {
		const rect = { x: 0, y: 0, width: 1000, height: 1000 };

		it('keeps a node fully inside the rect', () => {
			expect(isOutsideRect(rect, { x: 100, y: 100 }, { width: 96, height: 96 })).toBe(false);
		});

		it.each([
			{ side: 'left', position: { x: -200, y: 100 } },
			{ side: 'right', position: { x: 1100, y: 100 } },
			{ side: 'top', position: { x: 100, y: -200 } },
			{ side: 'bottom', position: { x: 100, y: 1100 } },
		])('culls a node fully outside the rect ($side)', ({ position }) => {
			expect(isOutsideRect(rect, position, { width: 96, height: 96 })).toBe(true);
		});

		it('keeps a node straddling the rect edge', () => {
			// Node overlaps the left boundary by 1px.
			expect(isOutsideRect(rect, { x: -95, y: 100 }, { width: 96, height: 96 })).toBe(false);
		});

		it('keeps an unmeasured zero-dimension node at the rect corner', () => {
			expect(isOutsideRect(rect, { x: 0, y: 0 }, { width: 0, height: 0 })).toBe(false);
		});
	});

	describe('gating', () => {
		it('stays inactive below the node-count threshold', () => {
			const { active } = useCanvasVirtualization({
				viewport: ref({ x: 0, y: 0, zoom: 1 }),
				dimensions: ref({ width: 800, height: 600 }),
				defaultNodeCount: computed(() => VIRTUALIZATION_MIN_NODES - 1),
			});

			expect(active.value).toBe(false);
		});

		it('activates at the node-count threshold', () => {
			const { active } = useCanvasVirtualization({
				viewport: ref({ x: 0, y: 0, zoom: 1 }),
				dimensions: ref({ width: 800, height: 600 }),
				defaultNodeCount: computed(() => VIRTUALIZATION_MIN_NODES),
			});

			expect(active.value).toBe(true);
		});
	});
});
