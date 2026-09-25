/**
 * Performance Optimizations
 */

export const LOGS_EXECUTION_DATA_THROTTLE_DURATION = 1000;
export const CANVAS_EXECUTION_DATA_THROTTLE_DURATION = 500;

/**
 * Repeat group-header clicks within this window are treated as one
 * double-click and toggle collapse only once. Kept well below the OS
 * double-click interval (~500ms) so deliberate fast re-clicks still register.
 */
export const CANVAS_GROUP_HEADER_TOGGLE_SUPPRESS_DURATION = 250;

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

/**
 * Progress polling for an agent eval run. A run executes the agent once per case,
 * so seconds is the right granularity — polling tighter only adds requests without
 * the user seeing anything sooner.
 */
export const AGENT_EVAL_RUN_POLL_INTERVAL = 2 * TIME.SECOND;
/** Give up on a run that never settles, so a forgotten tab can't poll indefinitely. */
export const AGENT_EVAL_RUN_POLL_TIMEOUT = 10 * TIME.MINUTE;
/** One failed poll is a blip worth retrying; a sustained run of them means we've lost the run. */
export const AGENT_EVAL_RUN_POLL_MAX_ERRORS = 3;

export const LOADING_ANIMATION_MIN_DURATION = 1000;

export const AGENT_EXTERNAL_UPDATE_NOTICE_DURATION = 5 * TIME.MINUTE;

/** Keeps short agent tool and skill calls perceptible without adding continuous motion. */
export const AGENT_CAPABILITY_ACTIVE_MIN_DURATION = 300;

/** Keeps a completed setup item visible briefly before returning to the checklist. */
export const SETUP_PANEL_SUCCESS_DELAY = 650;

/** Hover-intent delays for reveal-on-hover affordances (e.g. a collapsed group's description). */
export const HOVER_DELAY = {
	/** Delay before a hovered affordance reveals its content. */
	SHOW: 300,
	/** Grace period before hiding, so the cursor can bridge onto the revealed content. */
	LEAVE: 150,
} as const;

// `DEBOUNCE_TIME` moved to `@n8n/frontend-constants/durations` so a module outside the
// shell can debounce with the same values. Re-exported here for existing importers.
export { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
