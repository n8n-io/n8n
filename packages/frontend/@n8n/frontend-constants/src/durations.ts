/**
 * Centralized debounce timing constants. Use with getDebounceTime().
 *
 * They live here so a module outside the shell can debounce with the same values.
 * `@/app/constants/durations` re-exports this const; the other durations stay there.
 */
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
