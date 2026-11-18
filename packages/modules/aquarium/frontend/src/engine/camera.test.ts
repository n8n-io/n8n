import { ZOOM } from '../aquarium.constants';
import {
	canvasResolutionFor,
	clampCamera,
	fitCamera,
	fitZoom,
	panBy,
	screenToWorld,
	worldSizeFor,
	zoomAt,
	type Size,
} from './camera';

const viewport: Size = { width: 1200, height: 600 };

describe('worldSizeFor', () => {
	it('matches the viewport at the default zoom for a few creatures', () => {
		expect(worldSizeFor(500, viewport)).toEqual({
			width: viewport.width / ZOOM.default,
			height: viewport.height / ZOOM.default,
		});
	});

	it('grows with the creature area and keeps the aspect ratio', () => {
		const world = worldSizeFor(1_500 * 150, viewport);

		expect(world.width).toBeGreaterThan(viewport.width / ZOOM.default);
		expect(world.width / world.height).toBeCloseTo(2, 1);
		expect((1_500 * 150) / (world.width * world.height)).toBeLessThanOrEqual(ZOOM.creatureCoverage);
	});
});

describe('fitCamera', () => {
	it('uses the default zoom when the world fits', () => {
		const world = worldSizeFor(0, viewport);

		expect(fitCamera(viewport, world)).toEqual({ x: 0, y: 0, zoom: ZOOM.default });
	});

	it('zooms out to show a big world', () => {
		const world = { width: 900, height: 450 };
		const camera = fitCamera(viewport, world);

		expect(camera.zoom).toBeCloseTo(fitZoom(viewport, world));
		expect(camera.zoom).toBeLessThan(ZOOM.default);
	});
});

describe('clampCamera', () => {
	const world = { width: 900, height: 450 };

	it('keeps the zoom between the fit zoom and the maximum', () => {
		expect(clampCamera({ x: 0, y: 0, zoom: 0.01 }, viewport, world).zoom).toBeCloseTo(
			fitZoom(viewport, world),
		);
		expect(clampCamera({ x: 0, y: 0, zoom: 100 }, viewport, world).zoom).toBe(ZOOM.max);
	});

	it('keeps the view on the world', () => {
		const camera = clampCamera({ x: -50, y: 9_999, zoom: 4 }, viewport, world);

		expect(camera.x).toBe(0);
		expect(camera.y).toBe(world.height - viewport.height / 4);
	});

	it('centres a world that is smaller than the view', () => {
		const camera = clampCamera({ x: 0, y: 0, zoom: 1 }, viewport, { width: 300, height: 600 });

		expect(camera.x).toBe((300 - 1200) / 2);
	});

	it('never zooms out below the minimum, even for a huge world', () => {
		const huge = { width: 100_000, height: 50_000 };

		expect(fitCamera(viewport, huge).zoom).toBe(ZOOM.min);
	});
});

describe('zoomAt', () => {
	const world = { width: 900, height: 450 };

	it('keeps the world point under the anchor in place', () => {
		const camera = { x: 100, y: 50, zoom: 4 };
		const anchor = { x: 300, y: 200 };
		const before = screenToWorld(camera, anchor);

		const zoomed = zoomAt(camera, 2, anchor, viewport, world);

		expect(zoomed.zoom).toBe(8);
		expect(screenToWorld(zoomed, anchor).x).toBeCloseTo(before.x);
		expect(screenToWorld(zoomed, anchor).y).toBeCloseTo(before.y);
	});
});

describe('panBy', () => {
	it('moves the world with the pointer', () => {
		const world = { width: 900, height: 450 };
		const camera = { x: 200, y: 100, zoom: 4 };

		const panned = panBy(camera, { x: 40, y: -20 }, viewport, world);

		expect(panned.x).toBe(200 - 10);
		expect(panned.y).toBe(100 + 5);
	});
});

describe('top inset', () => {
	const world = { width: 900, height: 450 };
	const withInset = { ...viewport, insetTop: 100 };

	it('fits the world below the inset', () => {
		const camera = fitCamera(withInset, world);

		expect(camera.zoom).toBeCloseTo(Math.min(1200 / 900, 500 / 450));
		// The top of the world is on screen at the inset or below it.
		expect(-camera.y * camera.zoom).toBeGreaterThanOrEqual(100 - 0.001);
		expect((world.height - camera.y) * camera.zoom).toBeLessThanOrEqual(600 + 0.001);
	});

	it('lets the user pan the world up under the inset', () => {
		const camera = clampCamera({ x: 0, y: 200, zoom: 4 }, withInset, world);

		expect(camera.y).toBe(200);
	});

	it('does not fit a small world below the inset when it has none', () => {
		expect(fitCamera(viewport, world).y).toBeLessThanOrEqual(0);
	});
});

describe('canvasResolutionFor', () => {
	it('keeps the canvas at the screen size below zoom 1', () => {
		expect(canvasResolutionFor(0.25)).toBe(0.25);
		expect(canvasResolutionFor(1)).toBe(1);
		expect(canvasResolutionFor(4)).toBe(1);
	});
});
