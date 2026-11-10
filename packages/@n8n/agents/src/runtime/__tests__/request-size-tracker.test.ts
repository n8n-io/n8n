import { RequestSizeTracker } from '../memory/request-size-tracker';

describe('RequestSizeTracker', () => {
	it('uses the visible estimate before any call is measured', () => {
		const tracker = new RequestSizeTracker();

		expect(tracker.estimate(1_000)).toBe(1_000);
	});

	it('adds messages since the last call to the measured size', () => {
		const tracker = new RequestSizeTracker();
		tracker.record(50_000, 10_000);

		expect(tracker.estimate(10_000)).toBe(50_000);
		expect(tracker.estimate(12_500)).toBe(52_500);
	});

	it('subtracts messages removed since the last call', () => {
		const tracker = new RequestSizeTracker();
		tracker.record(50_000, 10_000);

		expect(tracker.estimate(4_000)).toBe(44_000);
	});

	it('falls back to the visible estimate plus the last overhead after invalidation', () => {
		const tracker = new RequestSizeTracker();
		tracker.record(50_000, 10_000);
		tracker.invalidate();

		expect(tracker.estimate(2_000)).toBe(42_000);
	});

	it('ignores calls without reported input tokens', () => {
		const tracker = new RequestSizeTracker();
		tracker.record(50_000, 10_000);
		tracker.record(0, 20_000);

		expect(tracker.estimate(10_000)).toBe(50_000);
	});

	it('never reports a negative overhead when the estimate exceeds the measurement', () => {
		const tracker = new RequestSizeTracker();
		tracker.record(5_000, 8_000);
		tracker.invalidate();

		expect(tracker.estimate(1_000)).toBe(1_000);
	});
});
