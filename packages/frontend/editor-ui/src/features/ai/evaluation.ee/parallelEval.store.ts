import { EVAL_PARALLEL_EXECUTION_FLAG } from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW } from '@/app/constants/localStorage';
import { usePostHog } from '@/app/stores/posthog.store';

// Sentinel used for workflows that haven't been saved yet (no id assigned).
// Mirrors the per-workflow localStorage pattern used elsewhere in the editor.
const NEW_WORKFLOW_SENTINEL = 'new';

export const DEFAULT_PARALLEL_CONCURRENCY = 3;

interface PerWorkflowState {
	parallelEnabled: boolean;
	concurrencyValue: number;
}

type StoredState = Record<string, PerWorkflowState>;

const buildDefaultState = (): PerWorkflowState => ({
	parallelEnabled: true,
	concurrencyValue: DEFAULT_PARALLEL_CONCURRENCY,
});

/**
 * Per-workflow UI state for the parallel-execution rollout. Visibility of the
 * UI is gated on the `080_eval_parallel_execution` PostHog flag (FE primary gate).
 * Backend has its own safety net that coerces flag-off requests to sequential.
 *
 * State shape: `{ [workflowId]: { parallelEnabled, concurrencyValue } }`.
 * Workflow id `'new'` is a sentinel for unsaved workflows; the entry becomes
 * orphaned in localStorage once the workflow gets a real id, but it's
 * harmless and self-cleaning across sessions.
 */
export const useParallelEvalStore = defineStore('parallelEval', () => {
	const postHog = usePostHog();
	const storage = useLocalStorage<StoredState>(
		LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW,
		{},
		// `flush: 'sync'` so reads-after-writes don't race in tight loops.
		{ deep: true, flush: 'sync' },
	);

	// Coerce `boolean | undefined` (PostHog's return shape) to a clean boolean.
	const isFeatureEnabled = computed(
		() => postHog.isFeatureEnabled(EVAL_PARALLEL_EXECUTION_FLAG) === true,
	);

	const resolveKey = (workflowId: string | undefined): string =>
		workflowId && workflowId.length > 0 ? workflowId : NEW_WORKFLOW_SENTINEL;

	// Always materialises a reactive entry in storage rather than returning a
	// detached default object. Without this, a read-only consumer reading
	// before any setter writes would observe a stale plain object that never
	// invalidates when storage updates.
	const ensureEntry = (key: string): PerWorkflowState => {
		if (!storage.value[key]) {
			storage.value[key] = buildDefaultState();
		}
		return storage.value[key];
	};

	const isParallel = (workflowId: string | undefined): boolean =>
		ensureEntry(resolveKey(workflowId)).parallelEnabled;

	const concurrencyValue = (workflowId: string | undefined): number =>
		ensureEntry(resolveKey(workflowId)).concurrencyValue;

	const setParallel = (workflowId: string | undefined, value: boolean): void => {
		ensureEntry(resolveKey(workflowId)).parallelEnabled = value;
	};

	const setConcurrencyValue = (workflowId: string | undefined, value: number): void => {
		// Guard against non-finite inputs (NaN from a cleared N8nInputNumber,
		// Infinity from edge-case maths). NaN would propagate through the
		// floor/min/max chain unchanged and persist a broken state, silently
		// violating the 1-10 contract. Fall back to the parallel default so
		// the checked-but-cleared UX feels natural rather than dropping to
		// sequential behind the user's back.
		const safe = Number.isFinite(value) ? value : DEFAULT_PARALLEL_CONCURRENCY;
		const clamped = Math.max(1, Math.min(10, Math.floor(safe)));
		ensureEntry(resolveKey(workflowId)).concurrencyValue = clamped;
	};

	/**
	 * The numeric concurrency the FE should send for a run. Returns `1` when
	 * the parallel checkbox is unchecked (sequential), the slider value when
	 * checked. Caller is responsible for skipping the field entirely when
	 * the feature flag is off.
	 */
	const effectiveConcurrency = (workflowId: string | undefined): number => {
		const state = ensureEntry(resolveKey(workflowId));
		return state.parallelEnabled ? state.concurrencyValue : 1;
	};

	return {
		isFeatureEnabled,
		isParallel,
		concurrencyValue,
		setParallel,
		setConcurrencyValue,
		effectiveConcurrency,
	};
});
