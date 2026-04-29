import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW } from '@/app/constants/localStorage';
import { usePostHog } from '@/app/stores/posthog.store';
import { DEFAULT_PARALLEL_CONCURRENCY, useParallelEvalStore } from './parallelEval.store';

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		isFeatureEnabled: vi.fn(() => false),
	})),
}));

describe('parallelEval.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.removeItem(LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('isFeatureEnabled', () => {
		it('reflects the PostHog flag (off by default)', () => {
			vi.mocked(usePostHog).mockReturnValue({
				isFeatureEnabled: vi.fn(() => false),
			} as never);

			const store = useParallelEvalStore();

			expect(store.isFeatureEnabled).toBe(false);
		});

		it('returns true when the rollout flag resolves true', () => {
			vi.mocked(usePostHog).mockReturnValue({
				isFeatureEnabled: vi.fn(() => true),
			} as never);

			const store = useParallelEvalStore();

			expect(store.isFeatureEnabled).toBe(true);
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
	});
});
