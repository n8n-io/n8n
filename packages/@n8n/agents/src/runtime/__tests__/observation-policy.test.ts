import type { ObservationalMemoryConfig } from '../../types';
import { decideResume, MemoryBudget, shouldStopObserving } from '../memory/observation-policy';

const noopReflect = async () => await Promise.resolve({ drop: [], merge: [] });

function resolveObservationThresholds(
	config: ObservationalMemoryConfig,
	window: number | undefined,
) {
	return MemoryBudget.resolve(config, window)?.thresholds;
}

describe('resolveObservationThresholds', () => {
	it('keeps the fixed thresholds when no shares are set', () => {
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
			observerBatch: 120_000,
			reflect: 40_000,
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
			observerBatch: 120_000,
			reflect: 120_000,
		});
	});

	it('uses a set reflector threshold over the reflect share', () => {
		expect(
			resolveObservationThresholds(
				{ windowShares: {}, reflectorThresholdTokens: 50_000, reflect: noopReflect as never },
				200_000,
			)?.reflect,
		).toBe(50_000);
	});

	it('falls back to fixed thresholds when the window is unknown', () => {
		const thresholds = resolveObservationThresholds(
			{ observerThresholdTokens: 30_000, windowShares: {} },
			undefined,
		);
		expect(thresholds?.observeFirst).toBe(30_000);
		expect(thresholds?.observerBatch).toBeUndefined();
	});

	it('uses an explicit window over the looked-up one', () => {
		expect(
			resolveObservationThresholds({ windowShares: { contextWindowTokens: 100_000 } }, 1_000_000)
				?.observeFirst,
		).toBe(20_000);
	});

	describe('with a window cap', () => {
		const capped = { maxContextWindowTokens: 200_000 };

		it('takes the shares from the cap when the model window is larger', () => {
			expect(
				resolveObservationThresholds(
					{ windowShares: capped, reflect: noopReflect as never },
					1_000_000,
				),
			).toEqual({
				observeFirst: 40_000,
				observeNew: 20_000,
				midRunSoft: 120_000,
				midRunHard: 180_000,
				observerBatch: 120_000,
				reflect: 120_000,
			});
		});

		it('keeps a model window smaller than the cap', () => {
			expect(resolveObservationThresholds({ windowShares: capped }, 100_000)?.observeFirst).toBe(
				20_000,
			);
		});

		it('uses the cap when the model window is unknown', () => {
			expect(resolveObservationThresholds({ windowShares: capped }, undefined)?.observeFirst).toBe(
				40_000,
			);
		});

		it('ignores a cap of 0', () => {
			expect(
				resolveObservationThresholds({ windowShares: { maxContextWindowTokens: 0 } }, 1_000_000)
					?.observeFirst,
			).toBe(200_000);
		});
	});
});

describe('decideResume', () => {
	const budget = MemoryBudget.resolve({ windowShares: {} }, 200_000)!;
	const now = Date.UTC(2026, 10, 10, 12);
	const warmSmall = {
		requestTokens: 50_000,
		budget,
		replaceableTokens: 30_000,
		now,
		lastActivityAt: now - 60_000,
		cacheTtlMs: 5 * 60_000,
		modelSwitched: false,
	};

	it('keeps the view while the cache is warm and the request fits', () => {
		expect(decideResume(warmSmall)).toBeUndefined();
	});

	it('keeps the view at the hard limit while it still fits the window', () => {
		expect(decideResume({ ...warmSmall, requestTokens: 190_000 })).toBeUndefined();
	});

	it('resumes over the window even when little would be replaced', () => {
		expect(decideResume({ ...warmSmall, requestTokens: 200_001, replaceableTokens: 0 })).toBe(
			'over-limit',
		);
	});

	it('resumes when the cache is cold', () => {
		expect(decideResume({ ...warmSmall, lastActivityAt: now - 6 * 60_000 })).toBe('cache-cold');
	});

	it('resumes when the thread moved to another model', () => {
		expect(decideResume({ ...warmSmall, modelSwitched: true })).toBe('model-switch');
	});

	it('does not resume a cold thread whose request is small', () => {
		expect(
			decideResume({ ...warmSmall, lastActivityAt: undefined, requestTokens: 39_999 }),
		).toBeUndefined();
	});

	it('does not resume when nothing observed would be replaced', () => {
		expect(
			decideResume({ ...warmSmall, lastActivityAt: undefined, replaceableTokens: 0 }),
		).toBeUndefined();
	});
});

describe('MemoryBudget', () => {
	it('caps the hard limit at the model window', () => {
		const budget = MemoryBudget.resolve({ observerThresholdTokens: 300_000 }, undefined)!;
		expect(budget.hardLimit).toBe(300_000);
		const capped = MemoryBudget.resolve(
			{ observerThresholdTokens: 300_000, windowShares: { contextWindowTokens: 1 } },
			undefined,
		);
		expect(capped?.isOverModelWindow(2)).toBe(true);
	});

	it('caps a fixed threshold at a looked-up model window', () => {
		const budget = MemoryBudget.resolve({ observerThresholdTokens: 300_000 }, 200_000)!;
		expect(budget.hardLimit).toBe(200_000);
		expect(budget.isOverModelWindow(200_000)).toBe(true);
	});

	it('keeps the looked-up model window when contextWindowTokens is zero', () => {
		const budget = MemoryBudget.resolve(
			{ observerThresholdTokens: 300_000, windowShares: { contextWindowTokens: 0 } },
			200_000,
		)!;
		expect(budget.modelWindow).toBe(200_000);
		expect(budget.hardLimit).toBe(180_000);
	});

	it('lets requests up to the memory window through', () => {
		const budget = MemoryBudget.resolve(
			{ windowShares: { maxContextWindowTokens: 200_000 } },
			1_000_000,
		)!;
		expect(budget.requestLimit).toBe(200_000);
		expect(budget.isOverModelWindow(999_999)).toBe(false);
	});
});

describe('shouldStopObserving', () => {
	it('stops after the first failure with disableForRun', () => {
		expect(shouldStopObserving({ failurePolicy: 'disableForRun' }, 1)).toBe(true);
	});

	it('retries until the failures in a row reach the limit', () => {
		const config = { failurePolicy: 'retry' as const, maxConsecutiveObserverFailures: 3 };
		expect(shouldStopObserving(config, 2)).toBe(false);
		expect(shouldStopObserving(config, 3)).toBe(true);
	});

	it('never stops without a failure', () => {
		expect(shouldStopObserving({ failurePolicy: 'disableForRun' }, 0)).toBe(false);
	});
});
