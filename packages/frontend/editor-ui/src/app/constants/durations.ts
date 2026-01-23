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

/**
 * Get debounce time with optional multiplier from sessionStorage.
 * Reads 'N8N_DEBOUNCE_MULTIPLIER' - defaults to 1 if not set.
 */
export function getDebounceTime(time: number): number {
	const stored = sessionStorage.getItem('N8N_DEBOUNCE_MULTIPLIER');
	const multiplier = stored !== null ? parseFloat(stored) : 1;
	return Math.round(time * (Number.isNaN(multiplier) ? 1 : multiplier));
}

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
