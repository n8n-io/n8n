import { LIVE_SPEED, SWIM_SPEED } from '../aquarium.constants';
import { emptyMetrics } from '../sources/source.utils';
import {
	complexityScore,
	failureRateOf,
	liveSpeedBoostFor,
	recentRate,
	sizeTierFor,
	swimSpeedFor,
} from './scaling';

describe('complexityScore', () => {
	it('grows with node count and with run time', () => {
		const small = complexityScore({ ...emptyMetrics(), complexity: 3 });
		const moreNodes = complexityScore({ ...emptyMetrics(), complexity: 10 });
		const slower = complexityScore({ ...emptyMetrics(), complexity: 3, averageRunTimeMs: 60_000 });

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
