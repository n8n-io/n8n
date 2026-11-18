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
 * Element size in CSS pixels. UI covers the top `insetTop` pixels, so fitting keeps the world
 * below them. The user can still pan the world under that UI.
 */
export interface Viewport extends Size {
	insetTop?: number;
}

export function insetOf(viewport: Viewport): number {
	return Math.min(Math.max(0, viewport.insetTop ?? 0), viewport.height / 2);
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
export function fitZoom(viewport: Viewport, world: Size): number {
	return Math.min(
		viewport.width / world.width,
		(viewport.height - insetOf(viewport)) / world.height,
	);
}

function zoomLimits(viewport: Viewport, world: Size): { min: number; max: number } {
	const min = Math.max(ZOOM.min, Math.min(ZOOM.default, fitZoom(viewport, world)));
	return { min, max: ZOOM.max };
}

/** Keeps the zoom in its limits and the view on the world. Centres a world smaller than the view. */
export function clampCamera(camera: Camera, viewport: Viewport, world: Size): Camera {
	const { min, max } = zoomLimits(viewport, world);
	const zoom = Math.min(max, Math.max(min, camera.zoom));
	const inset = insetOf(viewport) / zoom;
	// `start` is where the free area begins: below the inset, which only the y axis has.
	const clampAxis = (position: number, view: number, size: number, start: number) => {
		if (view - start >= size) return (size - view + start) / 2 - start;
		// Written out, so an axis without an inset clamps to 0 and not to -0.
		const lowest = start > 0 ? -start : 0;
		return Math.min(size - view, Math.max(lowest, position));
	};
	return {
		zoom,
		x: clampAxis(camera.x, viewport.width / zoom, world.width, 0),
		y: clampAxis(camera.y, viewport.height / zoom, world.height, inset),
	};
}

/** Shows the whole world, but never zooms in past the default. */
export function fitCamera(viewport: Viewport, world: Size): Camera {
	return clampCamera(
		{ x: 0, y: -Infinity, zoom: Math.min(ZOOM.default, fitZoom(viewport, world)) },
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
	viewport: Viewport,
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
export function panBy(camera: Camera, delta: Point, viewport: Viewport, world: Size): Camera {
	return clampCamera(
		{ ...camera, x: camera.x - delta.x / camera.zoom, y: camera.y - delta.y / camera.zoom },
		viewport,
		world,
	);
}

/**
 * Canvas pixels for each logical pixel. Zoomed out, one canvas pixel is one device pixel, so small
 * sprites stay sharp on a high-density screen. Zoomed in, CSS scales up a canvas of logical pixels.
 */
export function canvasResolutionFor(zoom: number, devicePixelRatio = 1): number {
	return zoom < ZOOM.detail ? zoom * Math.max(1, devicePixelRatio) : 1;
}

/** A rectangle on screen, in CSS pixels. */
export interface ScreenBox {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface PopupAnchor {
	/** The point that the popup touches, in CSS pixels. */
	x: number;
	y: number;
	/** The popup opens to the left of `x`. */
	toLeft: boolean;
	/** The popup opens above `y`. */
	above: boolean;
}

/** Puts a popup beside a box, toward the middle of the view. The anchor stays on screen. */
export function popupAnchorFor(box: ScreenBox, view: Size): PopupAnchor {
	const toLeft = (box.left + box.right) / 2 > view.width / 2;
	const above = (box.top + box.bottom) / 2 > view.height / 2;
	const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
	return {
		x: clamp(toLeft ? box.left : box.right, view.width),
		y: clamp(above ? box.bottom : box.top, view.height),
		toLeft,
		above,
	};
}
