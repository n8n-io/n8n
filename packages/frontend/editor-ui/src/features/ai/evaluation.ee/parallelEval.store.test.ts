import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW } from '@/app/constants/localStorage';
import { DEFAULT_PARALLEL_CONCURRENCY, useParallelEvalStore } from './parallelEval.store';

// Singleton-shaped mock so the store keeps a stable `settingsStore` reference
// across the test lifetime. Mutating `.settings.evaluationConcurrencyLimit`
// then propagates through the `maxConcurrency` `computed`'s reactive read of
// `settingsStore.settings?.evaluationConcurrencyLimit`, which mirrors how the
// real store updates after `/rest/login` resolves and settings are populated.
const mockSettingsState = reactive({
	settings: { evaluationConcurrencyLimit: -1 },
});
vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => mockSettingsState),
}));

const mockEvaluationConcurrencyLimit = (limit: number) => {
	mockSettingsState.settings.evaluationConcurrencyLimit = limit;
};

describe('parallelEval.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.removeItem(LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW);
		// Reset settings mock between tests; `clearAllMocks` only resets call
		// history, not `mockReturnValue` implementations, so cross-test bleed
		// would otherwise cap the slider in unrelated cases.
		mockEvaluationConcurrencyLimit(-1);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('isConcurrencyAvailable (visibility gate)', () => {
		it('is true when the effective limit is unlimited (-1)', () => {
			mockEvaluationConcurrencyLimit(-1);
			const store = useParallelEvalStore();
			expect(store.isConcurrencyAvailable).toBe(true);
		});

		it('is true when the effective limit is greater than 1', () => {
			mockEvaluationConcurrencyLimit(3);
			const store = useParallelEvalStore();
			expect(store.isConcurrencyAvailable).toBe(true);
		});

		it('is false when the effective limit collapses to 1 (Community/Pro/explicit env=1)', () => {
			mockEvaluationConcurrencyLimit(1);
			const store = useParallelEvalStore();
			expect(store.isConcurrencyAvailable).toBe(false);
		});
	});

	describe('per-workflow defaults', () => {
		it('isParallel defaults to true for an unsaved workflow', () => {
			const store = useParallelEvalStore();
			expect(store.isParallel('wf-a')).toBe(true);
		});

		it('concurrencyValue defaults to 3 for an unsaved workflow', () => {
			const store = useParallelEvalStore();
			expect(store.concurrencyValue('wf-a')).toBe(DEFAULT_PARALLEL_CONCURRENCY);
		});

		it('uses the "new" sentinel when workflowId is empty or undefined', () => {
			const store = useParallelEvalStore();
			store.setParallel('', false);
			store.setConcurrencyValue('', 7);

			expect(store.isParallel(undefined)).toBe(false);
			expect(store.concurrencyValue('')).toBe(7);
		});
	});

	describe('persistence', () => {
		it('per-workflow state is independent', () => {
			const store = useParallelEvalStore();
			store.setParallel('wf-a', false);
			store.setConcurrencyValue('wf-a', 5);

			expect(store.isParallel('wf-b')).toBe(true);
			expect(store.concurrencyValue('wf-b')).toBe(DEFAULT_PARALLEL_CONCURRENCY);
		});

		it('reflects writes via the public getters', () => {
			const store = useParallelEvalStore();
			store.setParallel('wf-a', false);
			store.setConcurrencyValue('wf-a', 8);

			expect(store.isParallel('wf-a')).toBe(false);
			expect(store.concurrencyValue('wf-a')).toBe(8);
		});

		it('"new" sentinel state survives a workflow ID assignment', () => {
			const store = useParallelEvalStore();
			store.setParallel(undefined, false);
			store.setConcurrencyValue(undefined, 4);

			// The user saves the workflow and gets a real id. The sentinel
			// entry remains in localStorage (orphaned but harmless); the new
			// id picks up the defaults — that's intentional, the choice was
			// per-workflow scoped.
			expect(store.isParallel('newly-assigned-id')).toBe(true);
			expect(store.concurrencyValue('newly-assigned-id')).toBe(DEFAULT_PARALLEL_CONCURRENCY);
			// And the sentinel still holds the user's pre-save selection.
			expect(store.isParallel(undefined)).toBe(false);
			expect(store.concurrencyValue(undefined)).toBe(4);
		});
	});

	describe('clamping', () => {
		it('setConcurrencyValue clamps to 1-10', () => {
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 0);
			expect(store.concurrencyValue('wf-a')).toBe(1);

			store.setConcurrencyValue('wf-a', 99);
			expect(store.concurrencyValue('wf-a')).toBe(10);

			store.setConcurrencyValue('wf-a', 4.7);
			expect(store.concurrencyValue('wf-a')).toBe(4);
		});

		it('setConcurrencyValue falls back to the default for non-finite input', () => {
			const store = useParallelEvalStore();

			// NaN propagates unchanged through Math.floor/min/max, so without a
			// guard a cleared N8nInputNumber would persist NaN and break the
			// 1-10 contract. Verify it lands at the parallel default instead.
			store.setConcurrencyValue('wf-a', Number.NaN);
			expect(store.concurrencyValue('wf-a')).toBe(DEFAULT_PARALLEL_CONCURRENCY);

			// Positive Infinity already clamps to 10 via Math.min, but pin the
			// behaviour explicitly so future refactors don't regress it.
			store.setConcurrencyValue('wf-b', Number.POSITIVE_INFINITY);
			expect(store.concurrencyValue('wf-b')).toBe(DEFAULT_PARALLEL_CONCURRENCY);

			store.setConcurrencyValue('wf-c', Number.NEGATIVE_INFINITY);
			expect(store.concurrencyValue('wf-c')).toBe(DEFAULT_PARALLEL_CONCURRENCY);
		});
	});

	describe('maxConcurrency (admin cap via N8N_CONCURRENCY_EVALUATION_LIMIT)', () => {
		it('defaults to 10 when the limit is unset (-1, "unlimited")', () => {
			mockEvaluationConcurrencyLimit(-1);
			const store = useParallelEvalStore();
			expect(store.maxConcurrency).toBe(10);
		});

		it('lowers the slider ceiling to the configured limit', () => {
			mockEvaluationConcurrencyLimit(5);
			const store = useParallelEvalStore();
			expect(store.maxConcurrency).toBe(5);
		});

		it('caps at 10 even when the configured limit is higher (BE clamp parity)', () => {
			mockEvaluationConcurrencyLimit(50);
			const store = useParallelEvalStore();
			expect(store.maxConcurrency).toBe(10);
		});

		it('treats 0 the same as unlimited (BE convention)', () => {
			mockEvaluationConcurrencyLimit(0);
			const store = useParallelEvalStore();
			expect(store.maxConcurrency).toBe(10);
		});

		it('setConcurrencyValue clamps writes to the configured limit', () => {
			mockEvaluationConcurrencyLimit(4);
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 9);
			expect(store.concurrencyValue('wf-a')).toBe(4);
		});

		it('concurrencyValue surfaces the clamped value when admin lowers the cap below a stored preference', () => {
			// Pre-existing user preference of 8 (stored when limit was open).
			mockEvaluationConcurrencyLimit(-1);
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 8);
			expect(store.concurrencyValue('wf-a')).toBe(8);

			// Admin lowers cap to 3 — UI should reflect 3, not 8.
			mockEvaluationConcurrencyLimit(3);
			expect(store.concurrencyValue('wf-a')).toBe(3);
		});

		it('effectiveConcurrency reflects the cap so the value sent to BE matches the slider', () => {
			mockEvaluationConcurrencyLimit(-1);
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 8);

			mockEvaluationConcurrencyLimit(2);
			expect(store.effectiveConcurrency('wf-a')).toBe(2);
		});
	});

	describe('effectiveConcurrency', () => {
		it('returns the slider value when parallel is enabled', () => {
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 6);
			expect(store.effectiveConcurrency('wf-a')).toBe(6);
		});

		it('returns 1 (sequential) when parallel is disabled, regardless of slider', () => {
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 6);
			store.setParallel('wf-a', false);
			expect(store.effectiveConcurrency('wf-a')).toBe(1);
		});

		it('returns 1 when concurrency is unavailable on the instance, regardless of stored state', () => {
			// Pre-existing per-workflow preference of 7 when the cap was open.
			mockEvaluationConcurrencyLimit(-1);
			const store = useParallelEvalStore();
			store.setConcurrencyValue('wf-a', 7);
			expect(store.effectiveConcurrency('wf-a')).toBe(7);

			// Cap drops to 1 (e.g. operator sets env to 1, or tier=Community).
			// Caller must send `1` — UI is gated to hide the slider anyway,
			// but the store guards against stale per-workflow state too.
			mockEvaluationConcurrencyLimit(1);
			expect(store.effectiveConcurrency('wf-a')).toBe(1);
		});
	});
});
