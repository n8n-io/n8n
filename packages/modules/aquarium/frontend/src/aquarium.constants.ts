export const AQUARIUM_VIEW = 'Aquarium';

/** CSS pixels for one logical pixel of the tank. */
export const PIXEL_SIZE = 4;

/** Height of the sand floor, in logical pixels. */
export const SAND_HEIGHT = 10;

/** Resting speed, from the execution count of the period. Live activity adds `LIVE_SPEED`. */
export const SWIM_SPEED = {
	min: 2,
	max: 14,
	/** Execution count at which a creature reaches `max`. */
	saturation: 10_000,
} as const;

/** Extra speed from the live start rate, on top of the resting speed. */
export const LIVE_SPEED = {
	maxBoost: 36,
	/** Starts per second at which the boost reaches `maxBoost`. */
	saturationPerSecond: 50,
	/** Full seconds that the rate is averaged over. Fewer reacts faster but flickers more. */
	rateSeconds: 5,
} as const;

export const MAX_SWIM_SPEED = SWIM_SPEED.max + LIVE_SPEED.maxBoost;

/** Time for the speed to cover about two thirds of a change, so it eases between polls. */
export const SPEED_EASING_SECONDS = 1.5;

/** Lower bounds of complexity score for each size tier. */
export const SIZE_TIER_THRESHOLDS = {
	small: 4,
	medium: 9,
	large: 16,
	huge: 30,
} as const;

export const BUBBLES_MIN_EXECUTIONS = 10;

/** Failure rate above which a creature looks sick. */
export const SICK_FAILURE_RATE = 0.2;

/** One fixed colour, so the renderer caches one tinted sprite for each species. */
export const SICK_TINT = '#7fbf3f';

/** Seconds for one on-and-off cycle of the sick tint. */
export const SICK_BLINK_SECONDS = 1;

/** Share of the normal swim speed that a sick creature keeps. */
export const SICK_SPEED_FACTOR = 0.4;

/** Delay between two polls of the live activity endpoint. */
export const ACTIVITY_POLL_MS = 2_000;

/** A data set can hold thousands of entities. The tank shows the most-run ones. */
export const DATASET_MAX_WORKFLOWS = 100;
export const DATASET_MAX_AGENTS = 10;

/** Window of the execution counts when a data set does not say. Insights use a week. */
export const DATASET_DEFAULT_WINDOW_SECONDS = 7 * 24 * 60 * 60;
