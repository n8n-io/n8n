import { DEBOUNCE_TIME } from '@/app/constants';

/**
 * Runs `fn` when the main thread is idle (via `requestIdleCallback`), falling
 * back to a macrotask in environments without `requestIdleCallback` support
 * (Safari < 18, jsdom).
 *
 * Intended for non-critical work, e.g. computing telemetry payloads, so it
 * stays off the interaction path. Because of that:
 * - errors thrown by `fn` are swallowed
 * - `fn` may never run if the tab is closed before the callback fires
 *
 * `timeout` guarantees `fn` runs within that many milliseconds even if the
 * main thread never goes idle.
 */
export function runWhenIdle(fn: () => void, { timeout = DEBOUNCE_TIME.TELEMETRY.BATCH } = {}) {
	const run = () => {
		try {
			fn();
		} catch {
			// non-critical work, don't propagate errors
		}
	};

	if (typeof window.requestIdleCallback === 'function') {
		window.requestIdleCallback(run, { timeout });
	} else {
		setTimeout(run, 0);
	}
}
