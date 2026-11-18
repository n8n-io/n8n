import type { ObjectDirective } from 'vue';

/**
 * Keeps eased SVG rotations on the short way round.
 *
 * The generated artwork places its shapes with `rotate()` angles that can land
 * anywhere in a full turn either way, and a transition on `transform` eases the
 * number as written: from -300 to 300 is 600 degrees of spin. Every angle has
 * equivalents a whole turn apart that draw identically, so after each update
 * this picks, for every rotated shape, the equivalent nearest the angle it is
 * showing now. It runs after the DOM is patched and before the browser lays it
 * out, so the transition only ever sees the short way.
 */

const ROTATE = /rotate\((-?[\d.]+)((?:\s+-?[\d.]+){0,2})\)/;

/** The angle, out of all that draw the same as `to`, nearest to `from`. */
const nearestTurn = (from: number, to: number) => from + ((((to - from) % 360) + 540) % 360) - 180;

/** The angle each shape is currently drawn with, which may differ from the attribute the renderer wrote. */
const shown = new WeakMap<Element, number>();

const settle = (root: Element) => {
	for (const shape of root.querySelectorAll('[transform]')) {
		const transform = shape.getAttribute('transform') ?? '';
		const match = ROTATE.exec(transform);
		if (!match) continue;
		const target = Number(match[1]);
		const from = shown.get(shape);
		const angle = from === undefined ? target : nearestTurn(from, target);
		shown.set(shape, angle);
		if (angle !== target) {
			shape.setAttribute('transform', transform.replace(ROTATE, `rotate(${angle}${match[2]})`));
		}
	}
};

export const vShortestTurn: ObjectDirective<Element> = {
	mounted: settle,
	updated: settle,
};
