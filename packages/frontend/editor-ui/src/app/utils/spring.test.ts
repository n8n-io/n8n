import { sampleSpring } from './spring';

describe('sampleSpring', () => {
	it('starts at `from` and lands exactly on `to`', () => {
		const { values, duration, frameMs } = sampleSpring({ from: 80, to: 0 });

		expect(values[0]).toBe(80);
		expect(values.at(-1)).toBe(0);
		expect(duration).toBe((values.length - 1) * frameMs);
	});

	it('returns a single sample when it already rests', () => {
		const { values, duration } = sampleSpring({ from: 0, to: 0 });

		expect(values).toEqual([0]);
		expect(duration).toBe(0);
	});

	it('does not cross the rest value when critically damped', () => {
		const { values } = sampleSpring({ from: 80, to: 0, dampingRatio: 1 });

		expect(values.every((value) => value >= 0)).toBe(true);
	});

	it('rebounds past the rest value when underdamped', () => {
		const { values } = sampleSpring({ from: 80, to: 0, dampingRatio: 0.6 });

		expect(Math.min(...values)).toBeLessThan(0);
		expect(values.at(-1)).toBe(0);
	});

	it('carries the start velocity before it turns back', () => {
		const away = sampleSpring({ from: 40, to: 0, velocity: 2000, dampingRatio: 1 });
		const still = sampleSpring({ from: 40, to: 0, dampingRatio: 1 });

		expect(away.values[2]).toBeGreaterThan(still.values[2]);
		expect(away.values.at(-1)).toBe(0);
	});

	it('settles sooner with a shorter response', () => {
		const fast = sampleSpring({ from: 80, to: 0, response: 0.2 });
		const slow = sampleSpring({ from: 80, to: 0, response: 0.6 });

		expect(fast.duration).toBeLessThan(slow.duration);
	});

	it('is always bounded in time', () => {
		const { duration } = sampleSpring({ from: 80, to: 0, dampingRatio: 0.05, response: 2 });

		expect(duration).toBeLessThanOrEqual(1500);
	});
});
