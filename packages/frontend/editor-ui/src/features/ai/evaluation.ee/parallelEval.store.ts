import { EVAL_PARALLEL_EXECUTION_FLAG } from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW } from '@/app/constants/localStorage';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';

// Sentinel used for workflows that haven't been saved yet (no id assigned).
// Mirrors the per-workflow localStorage pattern used elsewhere in the editor.
const NEW_WORKFLOW_SENTINEL = 'new';

export const DEFAULT_PARALLEL_CONCURRENCY = 3;

// Hard upper bound for the slider, mirrored on the BE in
// `test-runner.service.ee.ts`'s `runTest` clamp. Admins can lower this via
// `N8N_CONCURRENCY_EVALUATION_LIMIT`; they cannot raise it.
const SLIDER_HARD_MAX = 10;

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
	const settingsStore = useSettingsStore();
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

	// Effective slider ceiling: the BE's `N8N_CONCURRENCY_EVALUATION_LIMIT`
	// (`evaluationConcurrencyLimit`) further constrains the 1–10 UX range.
	// `<= 0` means unlimited per BE convention. Mirrors the runtime clamp in
	// `test-runner.service.ee.ts:runTest` so the slider can only offer values
	// the BE will actually accept.
	const maxConcurrency = computed(() => {
		const limit = settingsStore.settings?.evaluationConcurrencyLimit;
		return typeof limit === 'number' && limit > 0
			? Math.min(SLIDER_HARD_MAX, Math.floor(limit))
			: SLIDER_HARD_MAX;
	});

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

	// Read-side clamp (no mutation): if the admin lowers
	// `N8N_CONCURRENCY_EVALUATION_LIMIT` below a previously-stored value, the
	// UI surfaces the capped number while leaving the user's preference intact
	// in localStorage so it returns naturally if the cap is later raised.
	const concurrencyValue = (workflowId: string | undefined): number =>
		Math.min(ensureEntry(resolveKey(workflowId)).concurrencyValue, maxConcurrency.value);

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
		const clamped = Math.max(1, Math.min(maxConcurrency.value, Math.floor(safe)));
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
		// Use the read-side clamped value so what we send matches what the
		// slider shows when the admin cap is below the stored preference.
		return state.parallelEnabled ? Math.min(state.concurrencyValue, maxConcurrency.value) : 1;
	};

	return {
		isFeatureEnabled,
		maxConcurrency,
		isParallel,
		concurrencyValue,
		setParallel,
		setConcurrencyValue,
		effectiveConcurrency,
	};
});
