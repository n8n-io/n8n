import { describe, expect, it } from 'vitest';

import {
	attemptTotals,
	failedChecks,
	iterationPassed,
	rateNoise,
	sharedCaseNames,
	summarizeFirstBuilds,
	trend,
	typicalBuild,
} from './metrics';
import type { Arm, FirstBuild, IterationSummary, ScenarioRun, TrialMetrics } from './schema';

const build = (overrides: Partial<FirstBuild>): FirstBuild => ({
	firstOk: true,
	oneShot: true,
	callsToFirstSave: 1,
	rebuilds: 0,
	verifies: 1,
	scenarioPasses: [],
	...overrides,
});

const attempt = (
	id: string,
	passed: boolean,
	metrics: Partial<TrialMetrics> | null,
	overrides: Partial<IterationSummary> = {},
): IterationSummary =>
	({
		id,
		built: true,
		buildError: null,
		metrics,
		scenarios: [
			{ slug: 'two-orders', title: 'Two orders', passed, rootCause: 'root cause' } as ScenarioRun,
		],
		expectations: [],
		...overrides,
	}) as IterationSummary;

describe('iterationPassed', () => {
	it('fails an attempt with a failed expectation and no scenarios', () => {
		const failed = attempt('a', true, null, {
			scenarios: [],
			expectations: [{ expectation: 'Posts once', pass: false, reason: null }],
		});
		expect(iterationPassed(failed)).toBe(false);
	});

	it('passes a built attempt whose checks all pass', () => {
		expect(iterationPassed(attempt('a', true, null))).toBe(true);
	});
});

describe('typicalBuild', () => {
	it('picks the passing attempt closest to the median cost and time', () => {
		const attempts = [
			attempt('open', true, { cost: 0.4, wallSeconds: 60 }),
			attempt('cheap', true, { cost: 0.1, wallSeconds: 20 }),
			attempt('typical', true, { cost: 0.4, wallSeconds: 70 }),
			attempt('slow', true, { cost: 0.5, wallSeconds: 200 }),
			attempt('failed', false, { cost: 0.4, wallSeconds: 70 }),
			attempt(
				'expectation-failed',
				true,
				{ cost: 0.4, wallSeconds: 70 },
				{ expectations: [{ expectation: 'Posts once', pass: false, reason: null }] },
			),
			attempt('no-metrics', true, null),
		];
		expect(typicalBuild(attempts, { excludeId: 'open', passingOnly: true })?.id).toBe('typical');
	});

	it('returns undefined when no other attempt passed', () => {
		const attempts = [attempt('open', true, null), attempt('failed', false, null)];
		expect(typicalBuild(attempts, { excludeId: 'open', passingOnly: true })).toBeUndefined();
	});

	it('picks among all attempts when passingOnly is false', () => {
		const attempts = [
			attempt('cheap', false, { cost: 0.1, wallSeconds: 20 }),
			attempt('typical', false, { cost: 0.4, wallSeconds: 70 }),
			attempt('slow', false, { cost: 0.5, wallSeconds: 200 }),
		];
		expect(typicalBuild(attempts, { passingOnly: true })).toBeUndefined();
		expect(typicalBuild(attempts, { passingOnly: false })?.id).toBe('typical');
	});
});

describe('summarizeFirstBuilds', () => {
	it('follows the definitions of firstbuild.py', () => {
		const summary = summarizeFirstBuilds([
			build({ scenarioPasses: [true, true] }),
			build({ scenarioPasses: [true, false] }),
			build({
				firstOk: false,
				oneShot: false,
				callsToFirstSave: 2,
				rebuilds: 1,
				scenarioPasses: [true],
			}),
			build({ firstOk: false, oneShot: false, callsToFirstSave: null, verifies: 0 }),
		]);
		expect(summary).toEqual({
			builds: 4,
			firstOk: 2,
			oneShot: 2,
			callsToFirstSave: 4 / 3,
			rebuilds: 0.25,
			verifies: 0.75,
			withScenarios: 3,
			firstTryCorrect: 1,
			oneShotScenPass: 3,
			oneShotScenN: 4,
			scenPass: 4,
			scenN: 5,
		});
	});
});

describe('failedChecks', () => {
	const expectation = (pass: boolean) => ({ expectation: 'Posts once', pass, reason: 'why' });

	it('lists the failed checks of an attempt with their reason', () => {
		const failed = attempt('a', false, null, { expectations: [expectation(false)] });
		expect(failedChecks(failed)).toEqual([
			{ label: 'Two orders', reason: 'root cause' },
			{ label: 'Posts once', reason: 'why' },
		]);
	});
});

describe('trend', () => {
	it('colours a change by direction and points the arrow by sign', () => {
		expect(trend(0.35, 0.45, false)).toEqual({ direction: 'worse', arrow: 'arrow-up' });
		expect(trend(81, 60, false)).toEqual({ direction: 'better', arrow: 'arrow-down' });
	});

	it('treats a change below the noise floor as the same', () => {
		expect(trend(0.33, 0.334, false, 0.033)).toEqual({ direction: 'same', arrow: null });
		expect(trend(1 / 3, 2 / 3, true, rateNoise(3, 3))).toEqual({
			direction: 'better',
			arrow: 'arrow-up',
		});
	});

	it('has no direction for a missing value', () => {
		expect(trend(null, 1, true)).toEqual({ direction: null, arrow: null });
	});
});

describe('sharedCaseNames', () => {
	const arm = (...names: string[]) => ({ cases: names.map((name) => ({ name })) }) as Arm;

	it('keeps only the cases every arm ran', () => {
		expect(sharedCaseNames([arm('a', 'b', 'pool-only'), arm('b', 'a')])).toEqual(['a', 'b']);
	});
});

describe('attemptTotals', () => {
	it('counts passed and built attempts and takes medians per attempt', () => {
		const totals = attemptTotals([
			attempt('a', true, { cost: 0.2, wallSeconds: 10 }),
			attempt('b', false, { cost: 0.4, wallSeconds: 30 }),
			attempt('c', false, null, { built: false }),
		]);
		expect(totals).toEqual({
			attempts: 3,
			passed: 1,
			built: 2,
			medianCost: expect.closeTo(0.3),
			medianTime: 20,
		});
	});
});
