import { ref, toValue } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import type { Ref, MaybeRefOrGetter } from 'vue';

const DEFAULT_INTERVAL_MS = 5000;

/**
 * Cycles `activeIndex` through [0, count) on a fixed interval.
 *
 * - `pause()` / `resume()` — stop / restart the rotation (and toggle `isPaused`).
 *   Callers should derive *when* to pause from their own state via a single
 *   watch, so the interval has one source of truth and can't desync into a
 *   stuck-paused state.
 * - `activeIndex` is a writable ref, so a caller can re-anchor the rotation
 *   (e.g. continue from a hovered example) before resuming.
 *
 * Uses `useIntervalFn` from `@vueuse/core`, which auto-disposes when the
 * enclosing effect scope stops.
 *
 * Experiment cleanup: remove with instanceAiSplitEmptyState.
 */
export function useCyclingExamples(
	count: MaybeRefOrGetter<number>,
	opts?: { intervalMs?: number },
): {
	activeIndex: Ref<number>;
	isPaused: Ref<boolean>;
	pause(): void;
	resume(): void;
} {
	const intervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;

	const activeIndex = ref(0);
	const isPaused = ref(false);

	const { pause: stopInterval, resume: startInterval } = useIntervalFn(() => {
		const total = toValue(count);
		activeIndex.value = (activeIndex.value + 1) % total;
	}, intervalMs);

	function pause(): void {
		isPaused.value = true;
		stopInterval();
	}

	function resume(): void {
		isPaused.value = false;
		startInterval();
	}

	return { activeIndex, isPaused, pause, resume };
}
