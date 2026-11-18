import { ZOOM } from '../aquarium.constants';

export interface Size {
	width: number;
	height: number;
}

export interface Point {
	x: number;
	y: number;
}

/**
 * The part of the world on screen. `x` and `y` are the world position of the top-left corner,
 * in logical pixels. `zoom` is CSS pixels for each logical pixel.
 */
export interface Camera extends Point {
	zoom: number;
}

/**
 * Makes the world big enough that the creatures cover `ZOOM.creatureCoverage` of it. It never
 * gets smaller than the viewport at the default zoom, so a small tank looks as before.
 */
export function worldSizeFor(creatureArea: number, viewport: Size): Size {
	const base = {
		width: Math.max(1, Math.floor(viewport.width / ZOOM.default)),
		height: Math.max(1, Math.floor(viewport.height / ZOOM.default)),
	};
	const needed = creatureArea / ZOOM.creatureCoverage;
	const scale = Math.max(1, Math.sqrt(needed / (base.width * base.height)));
	return { width: Math.ceil(base.width * scale), height: Math.ceil(base.height * scale) };
}

/** The zoom at which the whole world is on screen. */
export function fitZoom(viewport: Size, world: Size): number {
	return Math.min(viewport.width / world.width, viewport.height / world.height);
}

function zoomLimits(viewport: Size, world: Size): { min: number; max: number } {
	const min = Math.max(ZOOM.min, Math.min(ZOOM.default, fitZoom(viewport, world)));
	return { min, max: ZOOM.max };
}

/** Keeps the zoom in its limits and the view on the world. Centres a world smaller than the view. */
export function clampCamera(camera: Camera, viewport: Size, world: Size): Camera {
	const { min, max } = zoomLimits(viewport, world);
	const zoom = Math.min(max, Math.max(min, camera.zoom));
	const clampAxis = (position: number, view: number, size: number) =>
		view >= size ? (size - view) / 2 : Math.min(size - view, Math.max(0, position));
	return {
		zoom,
		x: clampAxis(camera.x, viewport.width / zoom, world.width),
		y: clampAxis(camera.y, viewport.height / zoom, world.height),
	};
}

/** Shows the whole world, but never zooms in past the default. */
export function fitCamera(viewport: Size, world: Size): Camera {
	return clampCamera(
		{ x: 0, y: 0, zoom: Math.min(ZOOM.default, fitZoom(viewport, world)) },
		viewport,
		world,
	);
}

export function screenToWorld(camera: Camera, point: Point): Point {
	return { x: camera.x + point.x / camera.zoom, y: camera.y + point.y / camera.zoom };
}

/** Changes the zoom and keeps the world point under `anchor` (CSS pixels) in place. */
export function zoomAt(
	camera: Camera,
	factor: number,
	anchor: Point,
	viewport: Size,
	world: Size,
): Camera {
	const before = screenToWorld(camera, anchor);
	const zoom = clampCamera({ ...camera, zoom: camera.zoom * factor }, viewport, world).zoom;
	return clampCamera(
		{ zoom, x: before.x - anchor.x / zoom, y: before.y - anchor.y / zoom },
		viewport,
		world,
	);
}

/** Moves the view by a drag of `delta` CSS pixels. The world follows the pointer. */
export function panBy(camera: Camera, delta: Point, viewport: Size, world: Size): Camera {
	return clampCamera(
		{ ...camera, x: camera.x - delta.x / camera.zoom, y: camera.y - delta.y / camera.zoom },
		viewport,
		world,
	);
}
