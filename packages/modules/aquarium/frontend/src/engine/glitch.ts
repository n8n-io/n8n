import { SHIMMER, TOXIC_BUBBLES } from '../aquarium.constants';

/** Seconds that each stage of a glitch shows. */
const GLITCH_STAGE_SECONDS = 0.09;

/**
 * The stages of a glitch, in order: tinted and jumped to the side, scrambled, scrambled again
 * with other rows, then tinted in place.
 */
export const GLITCH_STAGES = { jump: 0, scrambled: 1, scrambledAgain: 2, tinted: 3 } as const;

/**
 * The stage of a sick creature's glitch at `age`, or -1 between glitches. Two cycles of
 * different lengths overlap, so the glitches come at irregular times.
 */
export function glitchStageAt(age: number, everySeconds: number): number {
	const main = age % everySeconds;
	if (main < GLITCH_STAGE_SECONDS * 4) return Math.floor(main / GLITCH_STAGE_SECONDS);
	const extra = age % (everySeconds * 1.618);
	if (extra < GLITCH_STAGE_SECONDS * 3) return Math.floor(extra / GLITCH_STAGE_SECONDS);
	return -1;
}

/**
 * How far the gold wave has crossed a running creature, from 0 to 1, or -1 between waves.
 * `seed` gives each creature its own timing.
 */
export function shimmerProgressAt(age: number, seed: number): number {
	const clock = age + (seed % 100) / 50;
	const t = clock % SHIMMER.everySeconds;
	return t < SHIMMER.sweepSeconds ? t / SHIMMER.sweepSeconds : -1;
}

/**
 * How far toxic bubble `index` of the current burst has risen, from 0 to 1, or -1 when it does
 * not show. `seed` gives each creature its own timing.
 */
export function toxicBubbleAt(age: number, seed: number, index: number): number {
	const clock = age + (seed % 100) / 40;
	const t = (clock % TOXIC_BUBBLES.everySeconds) - index * TOXIC_BUBBLES.gapSeconds;
	return t >= 0 && t < TOXIC_BUBBLES.lifeSeconds ? t / TOXIC_BUBBLES.lifeSeconds : -1;
}
