import { ref, toValue } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import type { Ref, MaybeRefOrGetter } from 'vue';

const DEFAULT_INTERVAL_MS = 5000;

/**
 * Cycles `activeIndex` through [0, count) on a fixed interval.
 *
 * - `pause()` — stops advancing and sets `isPaused = true`.
 * - `resume()` — restarts from now and sets `isPaused = false`.
 * - `goTo(i)` — jumps to index `i` and re-anchors the interval (pause + resume),
 *   so the next tick is always exactly `intervalMs` after the call.
 * - `peek(i)` — jumps to index `i` and pauses (used while the user hovers an
 *   example: pin it and stop rotating until `resume()`).
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
	goTo(i: number): void;
	peek(i: number): void;
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

	function goTo(i: number): void {
		activeIndex.value = i;
		stopInterval();
		startInterval();
	}

	function peek(i: number): void {
		activeIndex.value = i;
		pause();
	}

	return { activeIndex, isPaused, pause, resume, goTo, peek };
}
