export const AQUARIUM_VIEW = 'Aquarium';

/** CSS pixels for one logical pixel of the tank. */
export const PIXEL_SIZE = 4;

/** Height of the sand floor, in logical pixels. */
export const SAND_HEIGHT = 10;

export const SWIM_SPEED = {
	min: 2,
	max: 40,
	/** Execution count at which a creature reaches `max`. */
	saturation: 10_000,
} as const;

/** Lower bounds of complexity score for each size tier. */
export const SIZE_TIER_THRESHOLDS = {
	small: 4,
	medium: 9,
	large: 16,
	huge: 30,
} as const;

export const BUBBLES_MIN_EXECUTIONS = 10;
