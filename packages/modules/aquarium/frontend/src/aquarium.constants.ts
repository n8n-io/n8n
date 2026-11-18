export const AQUARIUM_VIEW = 'Aquarium';

/** CSS pixels for one logical pixel of the tank, at the default zoom. */
export const PIXEL_SIZE = 4;

export const ZOOM = {
	default: PIXEL_SIZE,
	/** Below 1, the canvas has more pixels than the screen. Lower values cost more to draw. */
	min: 0.5,
	max: 12,
	/** Factor for one mouse wheel step. */
	wheelStep: 1.15,
	/** Factor for one click on a zoom button. */
	buttonStep: 1.5,
	/** Share of the world that creature sprites cover. Lower spreads creatures out more. */
	creatureCoverage: 0.1,
} as const;

/** Sizes of project tanks, in logical pixels. */
export const PROJECT_TANK = {
	/** Width over height of a tank. */
	aspect: 16 / 9,
	minWidth: 96,
	minHeight: 32,
	/** Space between frames. Even, so half of it is a whole pixel. */
	gap: 6,
	/** Space between a creature and the tank wall, so it can turn. */
	margin: 4,
} as const;

/** A project label shows only when its tank is at least this wide on screen, in CSS pixels. */
export const PROJECT_LABEL_MIN_WIDTH = 72;

/** Pointer movement in CSS pixels after which a press becomes a drag and not a click. */
export const DRAG_THRESHOLD = 4;

/** Height of the sand floor, in logical pixels. */
export const SAND_HEIGHT = 10;

/** Furniture on the sand of each tank. Its look follows the health of the tank. */
export const PROP_LAYOUT = {
	/** Tank width for each prop. A narrow tank still gets one. */
	spacing: 80,
	max: 5,
	/** Pixels that the sand under a prop sinks into the floor. */
	sink: 3,
} as const;

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

/**
 * Health of a whole tank, from the failure share of all its workflows. The thresholds match fish
 * health: 0% is Positive, from `negative` is Negative, and above `critical` is Critical.
 */
export const TANK_HEALTH = {
	/** Runs that a tank needs before it is not Neutral. */
	minRuns: 10,
	negative: SICK_FAILURE_RATE,
	critical: 0.5,
} as const;

/** One fixed colour, so the renderer caches one tinted sprite for each species. */
export const SICK_TINT = '#7fbf3f';

/** Seconds for one on-and-off cycle of the sick tint. */
export const SICK_BLINK_SECONDS = 1;

/** Share of the normal swim speed that a sick creature keeps. */
export const SICK_SPEED_FACTOR = 0.4;

/** Delay between two polls of the live activity endpoint. */
export const ACTIVITY_POLL_MS = 2_000;

/** Limits that keep a very large data set fast to draw. The tank shows the most-run entities. */
export const DATASET_MAX_WORKFLOWS = 2_000;
export const DATASET_MAX_AGENTS = 500;

/** Window of the execution counts when a data set does not say. Insights use a week. */
export const DATASET_DEFAULT_WINDOW_SECONDS = 7 * 24 * 60 * 60;
