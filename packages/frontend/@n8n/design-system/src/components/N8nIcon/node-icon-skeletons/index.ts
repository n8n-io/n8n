import { nodeIconSkeletonData, nodeIconSkeletonSlugs } from './data';
import { MAX_SKELETON_SIZE, MIN_SKELETON_SIZE, SkeletonLibrary } from './engine';
import type { SkeletonVariant } from './engine';

let library: SkeletonLibrary | null = null;
const bodies = new Map<string, string | null>();

/** Sizes snap to a quarter pixel, so zooming the canvas reuses a small set of drawings. */
const SIZE_STEP = 0.25;

/** A drawing of a node icon at one size, for an `<svg>` with `viewBox="0 0 {viewBoxSize} {viewBoxSize}"`. */
export interface NodeIconDrawing {
	body: string;
	viewBoxSize: number;
}

/**
 * Draws a node icon for its size on screen. Between 12px and 24px the icon
 * moves between the drawings of the icon pack. Outside that range, the
 * nearest drawing scales.
 *
 * `idPrefix` must be unique on the page, because the drawing can hold masks.
 */
export function drawNodeIcon(
	name: string,
	screenSize: number,
	idPrefix: string,
	variant: SkeletonVariant = 'outline',
): NodeIconDrawing | null {
	const slug = nodeIconSkeletonSlugs[name];
	if (!slug) return null;

	const size =
		Math.round(Math.max(MIN_SKELETON_SIZE, Math.min(MAX_SKELETON_SIZE, screenSize)) / SIZE_STEP) *
		SIZE_STEP;
	const key = `${slug}/${variant}/${size}`;
	let body = bodies.get(key);
	if (body === undefined) {
		library ??= new SkeletonLibrary(nodeIconSkeletonData);
		// Cache with a fixed prefix, then give each icon its own mask ids.
		body = library.render(slug, variant, size, '__SKELETON_ID__');
		bodies.set(key, body);
	}
	if (body === null) return null;
	return { body: body.replaceAll('__SKELETON_ID__', idPrefix), viewBoxSize: size };
}
