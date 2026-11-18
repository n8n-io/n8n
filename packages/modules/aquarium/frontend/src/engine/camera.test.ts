import { ZOOM } from '../aquarium.constants';
import {
	canvasResolutionFor,
	clampCamera,
	fitCamera,
	fitZoom,
	panBy,
	popupAnchorFor,
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
	it('uses device pixels zoomed out, and logical pixels zoomed in', () => {
		expect(canvasResolutionFor(0.25)).toBe(0.25);
		expect(canvasResolutionFor(0.25, 2)).toBe(0.5);
		expect(canvasResolutionFor(1, 2)).toBe(2);
		expect(canvasResolutionFor(ZOOM.detail, 2)).toBe(1);
		expect(canvasResolutionFor(ZOOM.default, 2)).toBe(1);
	});
});

describe('popupAnchorFor', () => {
	const view = { width: 1000, height: 600 };

	it('opens right of and below a box in the top left', () => {
		expect(popupAnchorFor({ left: 100, top: 50, right: 140, bottom: 70 }, view)).toEqual({
			x: 140,
			y: 50,
			toLeft: false,
			above: false,
		});
	});

	it('opens left of and above a box in the bottom right', () => {
		expect(popupAnchorFor({ left: 800, top: 500, right: 840, bottom: 520 }, view)).toEqual({
			x: 800,
			y: 520,
			toLeft: true,
			above: true,
		});
	});

	it('keeps the anchor on screen when the box leaves the view', () => {
		expect(popupAnchorFor({ left: -80, top: -40, right: -20, bottom: -10 }, view)).toMatchObject({
			x: 0,
			y: 0,
		});
	});
});
