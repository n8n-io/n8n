import { describe, expect, it } from 'vitest';
import { getConstellationProgress, projectCanvasStars } from './zoom';

describe('canvas constellation zoom', () => {
	it('reveals the sky only at low zoom and reverses without state', () => {
		expect(getConstellationProgress(1)).toBe(0);
		expect(getConstellationProgress(0.32)).toBe(0);
		expect(getConstellationProgress(0.25)).toBeCloseTo(0.5);
		expect(getConstellationProgress(0.18)).toBe(1);
		expect(getConstellationProgress(0.05)).toBe(1);
		expect(getConstellationProgress(0.32)).toBe(0);
	});

	it('keeps stars at the rendered node centers through pan and zoom', () => {
		const nodes = [
			{
				id: 'a',
				computedPosition: { x: 100, y: 200 },
				dimensions: { width: 96, height: 120 },
				data: { name: 'Request', type: 'n8n-nodes-base.httpRequest' },
			},
		];
		const before = JSON.stringify(nodes);
		expect(projectCanvasStars(nodes, { x: 30, y: -40, zoom: 0.2 })).toEqual([
			{ id: 'a', name: 'Request', x: 59.6, y: 12 },
		]);
		expect(projectCanvasStars(nodes, { x: 50, y: -20, zoom: 0.4 })).toEqual([
			{ id: 'a', name: 'Request', x: 109.2, y: 84 },
		]);
		expect(JSON.stringify(nodes)).toBe(before);
	});

	it('omits hidden group members, group frames, and sticky notes', () => {
		const node = {
			id: 'a',
			computedPosition: { x: 0, y: 0 },
			dimensions: { width: 96, height: 96 },
		};
		const stars = projectCanvasStars(
			[
				{ ...node, hidden: true, data: { name: 'Hidden', type: 'n8n-nodes-base.noOp' } },
				{ ...node, data: { name: 'Group' } },
				{ ...node, data: { name: 'Note', type: 'n8n-nodes-base.stickyNote' } },
			],
			{ x: 0, y: 0, zoom: 1 },
		);
		expect(stars).toEqual([]);
	});
});
