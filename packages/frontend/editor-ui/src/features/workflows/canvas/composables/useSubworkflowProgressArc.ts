import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';

/** The total is only an upper bound, so a full turn is reserved for completion. */
const MAX_FRACTION = 0.9;

/** Share of the gap closed per tick — an exponential approach, so it decelerates. */
const TRICKLE_RATE = 0.15;

const TRICKLE_INTERVAL_MS = 1000;

/** Half a step: bounds the overstatement to less than one node, by construction. */
const TRICKLE_STEP_SHARE = 0.5;

type Progress = { currentNodeIndex: number; totalNodes: number } | undefined;

/**
 * Eased fill fraction for the sub-workflow progress arc, in [0, MAX_FRACTION].
 * Steps move it immediately; between them it trickles so a slow child node
 * doesn't read as a stalled bar. Returns 0 when there's nothing to draw.
 */
export function useSubworkflowProgressArc(progress: MaybeRefOrGetter<Progress>): {
	fraction: Ref<number>;
} {
	/** Fraction implied by completed steps alone — the part we actually know. */
	const stepFraction = computed(() => {
		const value = toValue(progress);
		if (!value || value.totalNodes <= 0) return 0;

		return Math.min(Math.max(value.currentNodeIndex / value.totalNodes, 0), MAX_FRACTION);
	});

	/** Ceiling the trickle may approach: this step plus part of the next. */
	const trickleTarget = computed(() => {
		const value = toValue(progress);
		if (!value || value.totalNodes <= 0) return 0;

		const stepSize = 1 / value.totalNodes;
		return Math.min(stepFraction.value + stepSize * TRICKLE_STEP_SHARE, MAX_FRACTION);
	});

	const fraction = ref(stepFraction.value);

	watch(stepFraction, (next, previous) => {
		// A drop means a new child execution restarted the count (a parent loop
		// calling the sub-workflow repeatedly), so don't hold the old high-water mark.
		if (next < previous) {
			fraction.value = next;
			return;
		}

		fraction.value = Math.max(fraction.value, next);
	});

	useIntervalFn(() => {
		const target = trickleTarget.value;
		if (fraction.value >= target) return;

		fraction.value += (target - fraction.value) * TRICKLE_RATE;
	}, TRICKLE_INTERVAL_MS);

	return { fraction };
}
