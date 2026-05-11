import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref } from 'vue';

import { PROGRESS_VERB_KEYS, useCyclingVerb } from './useCyclingVerb';

describe('useCyclingVerb', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('returns an i18n key (not a hardcoded English string) so the render site can translate', () => {
		// The composable must NOT return raw user-facing strings. Returning a
		// `BaseTextKey` is what lets the render site call
		// `useI18n().baseText(key)` and respect the active locale — which is
		// the whole point of moving the verb pool into `@n8n/i18n` instead of
		// inlining English in the composable. Asserting on the key shape here
		// pins the contract so a future change can't quietly regress to
		// returning a string value.
		// `useFakeTimers` here avoids leaking the composable's `setInterval`:
		// the test calls `useCyclingVerb` outside a component, so its
		// `onBeforeUnmount(stop)` never fires — without fake timers the real
		// interval would keep running after the test ends.
		vi.useFakeTimers();
		const enabled = ref(true);
		const verbKey = useCyclingVerb(enabled);

		expect(PROGRESS_VERB_KEYS).toContain(verbKey.value);
		expect(verbKey.value.startsWith('evaluation.runDetail.testCase.progress.')).toBe(true);
	});

	it('cycles to a different key on each interval tick while enabled', async () => {
		vi.useFakeTimers();
		// Walk Math.random across distinct fractions of the pool so each
		// pick lands on a distinct key. The exact identities don't matter —
		// the important property is that the value changes and stays inside
		// `PROGRESS_VERB_KEYS`. Fewer brittle index assumptions, same
		// regression coverage.
		let nextRandom = 0;
		const STEP = 1 / 5;
		vi.spyOn(Math, 'random').mockImplementation(() => {
			const r = ((nextRandom % 1) + 1) % 1; // keep in [0, 1)
			nextRandom += STEP;
			return r;
		});

		const enabled = ref(true);
		const verbKey = useCyclingVerb(enabled, 1000);
		const seen = new Set<string>([verbKey.value]);

		for (let i = 0; i < 4; i++) {
			await vi.advanceTimersByTimeAsync(1000);
			expect(PROGRESS_VERB_KEYS).toContain(verbKey.value);
			seen.add(verbKey.value);
		}

		// 5 distinct stride positions ⇒ at least 2 distinct keys observed.
		// Lower bound rather than exact count keeps the test robust if the
		// composable adds a "skip same key as last time" tweak later.
		expect(seen.size).toBeGreaterThanOrEqual(2);
	});

	it('stops cycling when `enabled` flips to false (no leaked timers on idle headers)', async () => {
		vi.useFakeTimers();
		const enabled = ref(true);
		const verbKey = useCyclingVerb(enabled, 1000);
		const initial = verbKey.value;

		enabled.value = false;
		// Vue's watcher with `flush: 'pre'` (default) runs on the microtask
		// queue. Pump the queue once so the `stop()` callback clears the
		// interval before we advance timers, otherwise the interval can
		// fire one more tick before the watcher runs.
		await Promise.resolve();

		await vi.advanceTimersByTimeAsync(5000);

		expect(verbKey.value).toBe(initial);
	});
});
