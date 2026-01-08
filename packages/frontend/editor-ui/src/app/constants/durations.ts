/**
 * Performance Optimizations
 */

export const LOGS_EXECUTION_DATA_THROTTLE_DURATION = 1000;
export const CANVAS_EXECUTION_DATA_THROTTLE_DURATION = 500;

export const EXPRESSION_EDITOR_PARSER_TIMEOUT = 15_000; // ms

export const CLOUD_TRIAL_CHECK_INTERVAL = 5000;

/**
 * Units of time in milliseconds
 */

export const TIME = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
};

export const THREE_DAYS_IN_MILLIS = 3 * TIME.DAY;
export const SEVEN_DAYS_IN_MILLIS = 7 * TIME.DAY;
export const SIX_MONTHS_IN_MILLIS = 6 * 30 * TIME.DAY;

export const LOADING_ANIMATION_MIN_DURATION = 1000;
