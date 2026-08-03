import { describe, expect, it } from 'vitest';

import {
	assessDriverConfound,
	deriveResults,
	fitLinear,
	fitSweep,
	formatHumanSummary,
	type LoadTestReport,
	type PhaseReadings,
	type RunLevelReport,
} from '../report';
import type { MetricSample, StabilizedReading } from '../sampler';

function reading(rssMB: number | null, heapUsedMB: number | null): StabilizedReading {
	return {
		phase: 'test',
		method: 'forced-gc',
		heapUsedMB,
		heapTotalMB: heapUsedMB,
		rssMB,
		pssMB: null,
		externalMB: null,
		nonHeapOverheadMB: null,
		sampleCount: 3,
		naturalGcCount: 1,
		waitedMs: 100,
		timedOut: false,
		at: '2026-08-03T00:00:00.000Z',
	};
}

// 10 users: idle costs 5MB each, peak adds 20MB each, half is retained after
// finishing, deleting threads frees most of it, 10MB residual overall.
const READINGS: PhaseReadings = {
	baseline: reading(400, 200),
	'threads-open': reading(450, 240),
	'load-peak': reading(650, 400),
	'post-load-idle': reading(550, 300),
	'sse-closed': reading(530, 290),
	'post-cleanup': reading(410, 210),
};

describe('deriveResults', () => {
	const derived = deriveResults(10, READINGS);

	it('divides phase deltas by the user count', () => {
		expect(derived.perUserIdle.rssMB).toBe(5);
		expect(derived.perUserIdle.heapMB).toBe(4);
		expect(derived.perUserPeakMarginal.rssMB).toBe(20);
		expect(derived.perUserPeakTotal.rssMB).toBe(25);
	});

	it('computes retention as post-load-idle minus threads-open', () => {
		// 550 - 450 = 100 over 10 users: what a *finished* thread still holds.
		expect(derived.perUserRetained.rssMB).toBe(10);
	});

	it('attributes the SSE connection and the thread delete separately', () => {
		expect(derived.perSseConnection.rssMB).toBe(2); // 550 - 530
		expect(derived.freedByDeleteThread.rssMB).toBe(12); // 530 - 410
	});

	it('reports residual leak absolutely and per user', () => {
		expect(derived.residualLeak.rssMB).toBe(10); // 410 - 400
		expect(derived.residualPerUser.rssMB).toBe(1);
	});

	it('surfaces a negative delta instead of clamping it', () => {
		// A negative per-user cost means the reading is untrustworthy; hiding it
		// would manufacture confidence.
		const negative = deriveResults(10, {
			baseline: reading(500, 300),
			'threads-open': reading(450, 250),
		});
		expect(negative.perUserIdle.rssMB).toBe(-5);
		expect(negative.perUserIdle.heapMB).toBe(-5);
	});

	it('returns null when a phase reading is missing', () => {
		const partial = deriveResults(10, { baseline: reading(400, 200) });
		expect(partial.perUserIdle.rssMB).toBeNull();
		expect(partial.perUserRetained.rssMB).toBeNull();
	});

	it('returns null when a metric is absent but the phase exists', () => {
		const noRss = deriveResults(10, {
			baseline: reading(null, 200),
			'threads-open': reading(null, 240),
		});
		expect(noRss.perUserIdle.rssMB).toBeNull();
		expect(noRss.perUserIdle.heapMB).toBe(4);
	});

	it('returns null rather than dividing by zero users', () => {
		expect(deriveResults(0, READINGS).perUserIdle.rssMB).toBeNull();
	});
});

describe('fitLinear', () => {
	it('recovers slope and intercept from a clean line', () => {
		// y = 100 + 7x
		const fit = fitLinear([
			{ x: 1, y: 107 },
			{ x: 5, y: 135 },
			{ x: 10, y: 170 },
		]);
		expect(fit?.slopeMBPerUser).toBe(7);
		expect(fit?.interceptMB).toBe(100);
		expect(fit?.r2).toBe(1);
	});

	it('reports a poor fit with a low r²', () => {
		const fit = fitLinear([
			{ x: 1, y: 100 },
			{ x: 2, y: 400 },
			{ x: 3, y: 120 },
		]);
		expect(fit).toBeDefined();
		expect(fit!.r2).toBeLessThan(0.9);
	});

	it('needs at least two points', () => {
		expect(fitLinear([{ x: 1, y: 100 }])).toBeUndefined();
		expect(fitLinear([])).toBeUndefined();
	});

	it('returns undefined when every point is at the same concurrency', () => {
		// No slope is identifiable — must not divide by zero.
		expect(
			fitLinear([
				{ x: 5, y: 100 },
				{ x: 5, y: 120 },
			]),
		).toBeUndefined();
	});

	it('treats a flat series as a perfect fit with zero slope', () => {
		const fit = fitLinear([
			{ x: 1, y: 100 },
			{ x: 10, y: 100 },
		]);
		expect(fit?.slopeMBPerUser).toBe(0);
		expect(fit?.r2).toBe(1);
	});
});

describe('fitSweep', () => {
	it('fits rss and heap independently and caps extrapolation at 2x', () => {
		const sweep = fitSweep([
			{ users: 1, rssMB: 107, heapMB: 53 },
			{ users: 5, rssMB: 135, heapMB: 65 },
			{ users: 10, rssMB: 170, heapMB: 80 },
		]);
		expect(sweep.rss?.slopeMBPerUser).toBe(7);
		expect(sweep.heap?.slopeMBPerUser).toBe(3);
		expect(sweep.maxTrustedUsers).toBe(20);
	});

	it('skips points whose metric is missing', () => {
		const sweep = fitSweep([
			{ users: 1, rssMB: 107, heapMB: null },
			{ users: 10, rssMB: 170, heapMB: null },
		]);
		expect(sweep.rss).toBeDefined();
		expect(sweep.heap).toBeUndefined();
	});

	it('handles an empty sweep', () => {
		const sweep = fitSweep([]);
		expect(sweep.rss).toBeUndefined();
		expect(sweep.maxTrustedUsers).toBe(0);
	});
});

describe('assessDriverConfound', () => {
	function sample(driverRssMB: number): MetricSample {
		return {
			at: '2026-08-03T00:00:00.000Z',
			phase: 'load',
			heapUsedMB: null,
			heapTotalMB: null,
			externalMB: null,
			rssMB: null,
			pssMB: null,
			nonHeapOverheadMB: null,
			eventLoopLagMs: null,
			gcCount: null,
			activeRuns: null,
			runsTotal: null,
			runsErrored: null,
			costUsd: null,
			tokensInput: null,
			tokensOutput: null,
			durableLogRows: null,
			durableLogBytes: null,
			driverRssMB,
			driverHeapUsedMB: driverRssMB / 2,
		};
	}

	it('stays quiet when the driver grows far less than the server', () => {
		const result = assessDriverConfound([sample(100), sample(105)], 300);
		expect(result.driverRssGrowthMB).toBe(5);
		expect(result.driverConfounded).toBe(false);
	});

	it('flags the run when driver growth exceeds 10% of server growth', () => {
		const result = assessDriverConfound([sample(100), sample(160)], 300);
		expect(result.driverRssGrowthMB).toBe(60);
		expect(result.driverConfounded).toBe(true);
	});

	it('does not flag when server growth is unknown or non-positive', () => {
		expect(assessDriverConfound([sample(100), sample(200)], null).driverConfounded).toBe(false);
		expect(assessDriverConfound([sample(100), sample(200)], 0).driverConfounded).toBe(false);
	});

	it('handles no samples', () => {
		expect(assessDriverConfound([], 300)).toEqual({
			driverConfounded: false,
			driverRssGrowthMB: null,
		});
	});
});

describe('formatHumanSummary', () => {
	function run(overrides: Partial<RunLevelReport> = {}): RunLevelReport {
		return {
			users: 5,
			dryRun: false,
			readings: READINGS,
			derived: deriveResults(5, READINGS),
			userResults: [],
			cleanup: { threadsDeleted: 5, workflowsDeleted: 0, dataTablesDeleted: 0, failures: [] },
			maxConcurrentRunsObserved: 5,
			plateauReached: true,
			costUsdDelta: 1.23,
			eventLoopLagMaxMs: 12,
			driverConfounded: false,
			driverRssGrowthMB: 3,
			serverRssGrowthMB: 250,
			phaseTimestamps: [],
			heapSnapshots: [],
			notes: [],
			...overrides,
		};
	}

	function report(runs: RunLevelReport[]): LoadTestReport {
		return {
			startedAt: '2026-08-03T00:00:00.000Z',
			finishedAt: '2026-08-03T00:10:00.000Z',
			baseUrl: 'http://localhost:5678',
			capabilities: {
				metrics: true,
				pss: false,
				gc: true,
				heapSnapshot: true,
				idleProbe: true,
				instanceAiEnabled: true,
			},
			stabilizeMethod: 'forced-gc',
			config: {} as LoadTestReport['config'],
			caseNames: ['hourly-ip-check'],
			runs,
			provisioning: { invited: 5, reused: 0, failed: 0 },
		};
	}

	it('flags a missing plateau on a real run', () => {
		const text = formatHumanSummary(
			report([run({ maxConcurrentRunsObserved: 2, plateauReached: false })]),
		);
		expect(text).toContain('PLATEAU NOT REACHED');
	});

	it('does not flag a plateau in a dry run, where there are no runs by design', () => {
		const text = formatHumanSummary(
			report([run({ dryRun: true, maxConcurrentRunsObserved: 0, plateauReached: false })]),
		);
		expect(text).not.toContain('PLATEAU NOT REACHED');
		expect(text).toContain('n/a (dry run)');
	});

	it('warns on a poor sweep fit', () => {
		const base = report([run({ users: 1 }), run({ users: 5 })]);
		const text = formatHumanSummary({
			...base,
			sweep: {
				rss: { slopeMBPerUser: 7, interceptMB: 100, r2: 0.4, points: 3 },
				maxTrustedUsers: 20,
			},
		});
		expect(text).toContain('POOR FIT');
	});

	it('surfaces the driver-confound warning', () => {
		const text = formatHumanSummary(report([run({ driverConfounded: true })]));
		expect(text).toContain('DRIVER MAY BE CONFOUNDING');
	});
});
