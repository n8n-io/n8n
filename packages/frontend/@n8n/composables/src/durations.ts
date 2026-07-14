/**
 * Debounce timing unit for `useDebounce`, colocated with its only consumer.
 *
 * `getDebounceTime` reads a `sessionStorage` multiplier (browser-only) and is a
 * function, so it must not live in the backend-imported `@n8n/constants`. The
 * general timing constants (`TIME`, `*_IN_MILLIS`, throttle durations, …) stay
 * in editor-ui's `app/constants` for the Wave 0.3 constants split (CAT-3686).
 */

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
