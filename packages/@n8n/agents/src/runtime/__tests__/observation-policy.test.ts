import {
	decideHistoryReplay,
	hasObserverBatchBudget,
	resolveObservationThresholds,
	shouldDisableAfterFailure,
} from '../memory/observation-policy';

const noopReflect = async () => await Promise.resolve({ drop: [], merge: [] });

describe('resolveObservationThresholds', () => {
	it('keeps the fixed thresholds by default', () => {
		expect(
			resolveObservationThresholds(
				{ observerThresholdTokens: 30_000, reflectorThresholdTokens: 40_000 },
				200_000,
			),
		).toEqual({
			observeFirst: 30_000,
			observeNew: 30_000,
			midRunSoft: 21_000,
			midRunHard: 30_000,
			replayLimit: 180_000,
			reflect: 40_000,
			source: 'fixed',
		});
	});

	it('scales thresholds to the context window when shares are set', () => {
		expect(
			resolveObservationThresholds(
				{ observerThresholdTokens: 30_000, windowShares: {}, reflect: noopReflect as never },
				200_000,
			),
		).toEqual({
			observeFirst: 40_000,
			observeNew: 20_000,
			midRunSoft: 120_000,
			midRunHard: 180_000,
			replayLimit: 180_000,
			reflect: 120_000,
			source: 'windowShare',
		});
	});

	it('falls back to fixed thresholds when the window is unknown', () => {
		expect(
			resolveObservationThresholds({ observerThresholdTokens: 30_000, windowShares: {} }, undefined)
				?.source,
		).toBe('fixed');
	});

	it('uses an explicit window over the looked-up one', () => {
		expect(
			resolveObservationThresholds({ windowShares: { contextWindowTokens: 100_000 } }, 1_000_000)
				?.observeFirst,
		).toBe(20_000);
	});

	it('keeps the replay limit at the observer threshold when the window is unknown', () => {
		expect(
			resolveObservationThresholds({ observerThresholdTokens: 30_000 }, undefined)?.replayLimit,
		).toBe(30_000);
	});

	it('caps the replay limit at the window share when the fixed threshold is larger', () => {
		expect(
			resolveObservationThresholds({ observerThresholdTokens: 150_000 }, 100_000)?.replayLimit,
		).toBe(90_000);
	});
});

describe('decideHistoryReplay', () => {
	const thresholds = resolveObservationThresholds({ observerThresholdTokens: 1_000 }, undefined)!;
	const now = Date.UTC(2026, 10, 7, 12);

	it('masks in the default mode', () => {
		expect(
			decideHistoryReplay({
				config: {},
				now,
				lastActivityAt: now,
				fullHistoryTokens: 1,
				thresholds,
			}),
		).toEqual({ kind: 'sinceCursor', reason: 'masked-mode' });
	});

	it('replays the full history while the cache is warm', () => {
		expect(
			decideHistoryReplay({
				config: { historyMode: 'cacheAware' },
				now,
				lastActivityAt: now - 60_000,
				fullHistoryTokens: 500,
				thresholds,
			}),
		).toEqual({ kind: 'full' });
	});

	it('swaps when the cache is cold', () => {
		expect(
			decideHistoryReplay({
				config: { historyMode: 'cacheAware' },
				now,
				lastActivityAt: now - 6 * 60_000,
				fullHistoryTokens: 500,
				thresholds,
			}),
		).toEqual({ kind: 'sinceCursor', reason: 'cache-cold' });
	});

	it('swaps when the history is over the hard limit', () => {
		expect(
			decideHistoryReplay({
				config: { historyMode: 'cacheAware' },
				now,
				lastActivityAt: now,
				fullHistoryTokens: 1_000,
				thresholds,
			}),
		).toEqual({ kind: 'sinceCursor', reason: 'over-limit' });
	});

	// Regression: with fixed thresholds the Observer runs only once history passes
	// the threshold, so a limit equal to it never replayed full history.
	it('replays full history past the fixed observer threshold when the window is known', () => {
		expect(
			decideHistoryReplay({
				config: { historyMode: 'cacheAware' },
				now,
				lastActivityAt: now,
				fullHistoryTokens: 10_000,
				thresholds: resolveObservationThresholds({ observerThresholdTokens: 4_000 }, 1_000_000)!,
			}),
		).toEqual({ kind: 'full' });
	});

	it('uses the provider cache retention when cacheTtlMs is unset', () => {
		const input = {
			config: { historyMode: 'cacheAware' as const },
			now,
			lastActivityAt: now - 30 * 60_000,
			fullHistoryTokens: 500,
			thresholds,
		};
		expect(decideHistoryReplay({ ...input, defaultCacheTtlMs: 60 * 60_000 })).toEqual({
			kind: 'full',
		});
		expect(
			decideHistoryReplay({
				...input,
				config: { ...input.config, cacheTtlMs: 5 * 60_000 },
				defaultCacheTtlMs: 60 * 60_000,
			}),
		).toEqual({ kind: 'sinceCursor', reason: 'cache-cold' });
	});
});

describe('failure policy and batch budget', () => {
	it('disables after the first failure by default', () => {
		expect(shouldDisableAfterFailure({}, 1)).toBe(true);
	});

	it('retries until the batch cap', () => {
		const config = { failurePolicy: 'retry' as const, maxObserverBatchesPerRun: 3 };
		expect(shouldDisableAfterFailure(config, 2)).toBe(false);
		expect(shouldDisableAfterFailure(config, 3)).toBe(true);
		expect(hasObserverBatchBudget(config, 2)).toBe(true);
		expect(hasObserverBatchBudget(config, 3)).toBe(false);
	});

	it('has no batch cap when unset', () => {
		expect(hasObserverBatchBudget({}, 1_000)).toBe(true);
	});
});
