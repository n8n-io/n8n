import {
	decideResume,
	resolveObservationThresholds,
	shouldDisableAfterFailure,
} from '../memory/observation-policy';

const noopReflect = async () => await Promise.resolve({ drop: [], merge: [] });

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
			observerBatch: 120_000,
			reflect: 120_000,
			source: 'windowShare',
		});
	});

	it('falls back to fixed thresholds when the window is unknown', () => {
		const thresholds = resolveObservationThresholds(
			{ observerThresholdTokens: 30_000, windowShares: {} },
			undefined,
		);
		expect(thresholds?.source).toBe('fixed');
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
				source: 'windowShare',
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
	const thresholds = resolveObservationThresholds({ windowShares: {} }, 200_000)!;
	const now = Date.UTC(2026, 10, 10, 12);
	const warmSmall = {
		requestTokens: 50_000,
		thresholds,
		windowTokens: 200_000,
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

describe('shouldDisableAfterFailure', () => {
	it('disables after the first failure with disableForRun', () => {
		expect(shouldDisableAfterFailure({ failurePolicy: 'disableForRun' })).toBe(true);
	});

	it('keeps retrying with retry', () => {
		expect(shouldDisableAfterFailure({ failurePolicy: 'retry' })).toBe(false);
	});
});
