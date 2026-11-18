import { LIVE_SPEED, SWIM_SPEED } from '../aquarium.constants';
import type { EntityActivity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import {
	complexityScore,
	failureRateOf,
	liveSpeedBoostFor,
	recentRate,
	allRunsWaiting,
	allRunsWaitingNow,
	allRunsWaitingOf,
	sizeTierFor,
	waitingShareOf,
	swimSpeedFor,
} from './scaling';

describe('complexityScore', () => {
	it('grows with node count and with run time', () => {
		const small = complexityScore({ ...emptyMetrics(), complexity: 3 });
		const moreNodes = complexityScore({ ...emptyMetrics(), complexity: 10 });
		const slower = complexityScore({
			...emptyMetrics(),
			complexity: 3,
			averageRunTimeMs: 60_000,
			waitingCount: 0,
			finishedCount: 0,
		});

		expect(moreNodes).toBeGreaterThan(small);
		expect(slower).toBeGreaterThan(small);
	});
});

describe('sizeTierFor', () => {
	it.each([
		[0, 'tiny'],
		[4, 'small'],
		[9, 'medium'],
		[16, 'large'],
		[30, 'huge'],
		[500, 'huge'],
	])('maps score %d to %s', (score, tier) => {
		expect(sizeTierFor(score)).toBe(tier);
	});
});

describe('swimSpeedFor', () => {
	it('stays between the minimum and maximum speed', () => {
		expect(swimSpeedFor(0)).toBe(SWIM_SPEED.min);
		expect(swimSpeedFor(SWIM_SPEED.saturation)).toBeCloseTo(SWIM_SPEED.max);
		expect(swimSpeedFor(SWIM_SPEED.saturation * 100)).toBe(SWIM_SPEED.max);
	});

	it('increases with the execution count', () => {
		expect(swimSpeedFor(100)).toBeGreaterThan(swimSpeedFor(10));
	});

	it('gives any run a clear lift over no runs', () => {
		expect(swimSpeedFor(1)).toBeGreaterThan(SWIM_SPEED.ranMin);
		expect(SWIM_SPEED.ranMin).toBeGreaterThan(SWIM_SPEED.min);
	});
});

describe('failureRateOf', () => {
	it('returns 0 without executions', () => {
		expect(failureRateOf(emptyMetrics())).toBe(0);
	});

	it('divides failed by total executions', () => {
		expect(failureRateOf({ ...emptyMetrics(), executionCount: 10, failedCount: 3 })).toBe(0.3);
	});
});

describe('recentRate', () => {
	it('averages the last full seconds', () => {
		expect(recentRate([0, 0, 5, 5, 15, 15, 15, 15, 15], 5)).toBe(15);
		expect(recentRate([5, 5, 5, 15, 15], 5)).toBe(9);
	});

	it('returns 0 for an empty series', () => {
		expect(recentRate([])).toBe(0);
	});
});

describe('liveSpeedBoostFor', () => {
	it('is 0 without runs and capped at the maximum', () => {
		expect(liveSpeedBoostFor(0)).toBe(0);
		expect(liveSpeedBoostFor(LIVE_SPEED.saturationPerSecond * 10)).toBe(LIVE_SPEED.maxBoost);
	});

	it('gives a clearly bigger boost at 15 runs per second than at 5', () => {
		expect(liveSpeedBoostFor(15) - liveSpeedBoostFor(5)).toBeGreaterThan(5);
	});
});

describe('waitingShareOf', () => {
	it('is the share of runs that are paused, and is not a failure', () => {
		const metrics = { ...emptyMetrics(), executionCount: 10, waitingCount: 4, finishedCount: 6 };

		expect(waitingShareOf(metrics)).toBe(0.4);
		expect(failureRateOf(metrics)).toBe(0);
	});
});

describe('all runs waiting', () => {
	const live = (overrides: Partial<EntityActivity> = {}): EntityActivity => ({
		running: 0,
		started: 0,
		succeeded: 0,
		failed: 0,
		waiting: 0,
		paused: 0,
		startedPerSecond: [],
		lastEventAt: 0,
		...overrides,
	});

	it('is true when runs are paused and none has finished', () => {
		expect(allRunsWaitingOf({ ...emptyMetrics(), waitingCount: 3, finishedCount: 0 })).toBe(true);
		expect(allRunsWaitingOf({ ...emptyMetrics(), waitingCount: 3, finishedCount: 1 })).toBe(false);
		expect(allRunsWaitingOf(emptyMetrics())).toBe(false);
	});

	it('is true live when runs are paused and nothing ran or ended in the window', () => {
		expect(allRunsWaitingNow(live({ waiting: 2, started: 2, paused: 2 }))).toBe(true);
		expect(allRunsWaitingNow(live({ waiting: 2, succeeded: 1 }))).toBe(false);
		expect(allRunsWaitingNow(live({ waiting: 2, running: 1 }))).toBe(false);
	});

	it('prefers live activity when the window has runs', () => {
		const allPausedBefore = { ...emptyMetrics(), waitingCount: 3, finishedCount: 0 };

		expect(allRunsWaiting(allPausedBefore)).toBe(true);
		// A run just succeeded, so not every run is waiting any more.
		expect(allRunsWaiting(allPausedBefore, live({ started: 1, succeeded: 1, waiting: 3 }))).toBe(
			false,
		);
		// Nothing happened live, so the metrics decide.
		expect(allRunsWaiting(allPausedBefore, live())).toBe(true);
	});
});
