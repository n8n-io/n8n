import { SWIM_SPEED } from '../aquarium.constants';
import { emptyMetrics } from '../sources/source.utils';
import { complexityScore, failureRateOf, sizeTierFor, swimSpeedFor } from './scaling';

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
