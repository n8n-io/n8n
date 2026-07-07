import { effectScope } from 'vue';

/**
 * Timer-leak guards for editor-ui unit tests (DEVP-635).
 *
 * A debounce / throttle / interval / timeout scheduled during a test but never
 * cancelled before jsdom teardown fires *after* the test finishes — `document`
 * and `window` are gone, the callback throws, and Vitest 4 promotes the
 * unhandled rejection to a run-level failure. It is a non-deterministic,
 * timing-dependent flake that slips past a PR's `vitest related` scope and only
 * surfaces post-merge on master.
 *
 * These helpers turn that post-merge flake into a deterministic, in-scope
 * failure: run the code under fake timers and assert nothing is left pending.
 *
 * @see useWorkflowSaving.ts `autoSaveWorkflowDebounced` — the canonical leak.
 */

/**
 * Assert that no timers are still pending. Only meaningful under fake timers
 * (`vi.useFakeTimers()`), where leaked `setTimeout`/`setInterval` (including the
 * ones backing `useDebounceFn`/`useThrottleFn`) are countable; a no-op under
 * real timers. Call it from an `afterEach`, or via {@link withLeakGuardedFakeTimers}.
 */
export function assertNoLeakedTimers(): void {
	if (!vi.isFakeTimers()) return;
	const pending = vi.getTimerCount();
	expect(
		pending,
		`${pending} timer(s) still pending at test end — a debounce/throttle/interval/timeout ` +
			'was scheduled but never cancelled. Cancel it on scope disposal (onScopeDispose/onUnmounted) ' +
			'or drain it (vi.runAllTimers) before the test ends.',
	).toBe(0);
}

/**
 * Opt-in, describe-level guard. Enables fake timers before each test and, after
 * each test, asserts no timer leaked before restoring real timers. Drop this at
 * the top of a `describe` for any suite exercising debounced/timer side-effects:
 *
 * ```ts
 * describe('useThing', () => {
 *   withLeakGuardedFakeTimers();
 *   it('...', () => { ... });
 * });
 * ```
 */
export function withLeakGuardedFakeTimers(): void {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		try {
			assertNoLeakedTimers();
		} finally {
			// Always restore, so a leak in one test doesn't cascade into the next.
			vi.useRealTimers();
		}
	});
}

/**
 * Run a composable inside an isolated reactive scope and prove it tears down its
 * scheduled side-effects when the scope is disposed (DEVP-635, lever 3).
 *
 * Verifies *cleanup happened* rather than merely dodging the post-teardown
 * crash: after `trigger` schedules the side-effect there must be a pending
 * timer, and after the scope is stopped there must be none — which only holds
 * if the composable registered `onScopeDispose`/`onUnmounted` cleanup or its
 * exposed cancel was wired up.
 *
 * Uses fake timers internally and restores real timers before returning.
 *
 * @param composable factory returning the composable's public API
 * @param trigger    schedules the side-effect (e.g. calls the debounced fn)
 */
export function expectScopeDisposalCancelsTimers<T>(
	composable: () => T,
	trigger: (api: T) => void,
): void {
	vi.useFakeTimers();
	const scope = effectScope();
	try {
		const api = scope.run(composable);
		if (api === undefined) {
			throw new Error('Composable returned no value; cannot trigger its side-effect.');
		}

		trigger(api);
		expect(
			vi.getTimerCount(),
			'Expected the composable to schedule a timer when triggered, but none was pending.',
		).toBeGreaterThan(0);

		scope.stop();
		expect(
			vi.getTimerCount(),
			'Scope was disposed but a timer is still pending — the composable does not cancel its ' +
				'scheduled side-effect on teardown. Register onScopeDispose/onUnmounted or wire up its cancel.',
		).toBe(0);
	} finally {
		vi.useRealTimers();
	}
}
