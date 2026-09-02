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

/** Keeps short agent tool and skill calls perceptible without adding continuous motion. */
export const AGENT_CAPABILITY_ACTIVE_MIN_DURATION = 300;

/** Hover-intent delays for reveal-on-hover affordances (e.g. a collapsed group's description). */
export const HOVER_DELAY = {
	/** Delay before a hovered affordance reveals its content. */
	SHOW: 300,
	/** Grace period before hiding, so the cursor can bridge onto the revealed content. */
	LEAVE: 150,
} as const;

/** Centralized debounce timing constants. Use with getDebounceTime(). */
export const DEBOUNCE_TIME = {
	/** UI responsiveness - very fast feedback */
	UI: {
		/** Window/element resize events */
		RESIZE: 50,
		/** Quick UI state changes */
		QUICK: 10,
	},

	/** Input validation and real-time feedback */
	INPUT: {
		/** Fast validation feedback (100ms) */
		VALIDATION: 100,
		/** Text input changes (200ms) */
		TEXT_CHANGE: 200,
		/** Search input in UI (250-300ms) */
		SEARCH: 300,
	},

	/** API and resource operations */
	API: {
		/** Resource dropdown search (500ms) */
		RESOURCE_SEARCH: 500,
		/** Heavy operations like pagination (1000ms) */
		HEAVY_OPERATION: 1000,
		/** Workflow autosave debounce (1500ms) */
		AUTOSAVE: 1500,
		/** Workflow autosave max wait - forces save (5000ms) */
		AUTOSAVE_MAX_WAIT: 5000,
	},

	/** Telemetry and analytics */
	TELEMETRY: {
		/** Analytics event batching (2000ms) */
		BATCH: 2000,
		/** Tracking filter changes (1000ms) */
		TRACK: 1000,
	},

	/** Collaboration features */
	COLLABORATION: {
		/** Activity recording (100ms) */
		ACTIVITY: 100,
	},

	/** Connection management */
	CONNECTION: {
		/** WebSocket disconnect debounce (500ms) */
		WEBSOCKET_DISCONNECT: 500,
	},
} as const;
