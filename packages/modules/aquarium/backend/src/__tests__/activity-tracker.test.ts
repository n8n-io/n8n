import { ActivityTracker } from '../activity-tracker';

const WINDOW = 60;
const MAX_RUNNING = 10 * 60 * 1000;
const T0 = 1_700_000_000_000;

describe('ActivityTracker', () => {
	let tracker: ActivityTracker;

	beforeEach(() => {
		tracker = new ActivityTracker(WINDOW, MAX_RUNNING);
	});

	it('counts a run as running until it ends', () => {
		tracker.recordStarted('wf', 'e1', T0);
		expect(tracker.snapshot(T0)).toEqual([
			{
				workflowId: 'wf',
				running: 1,
				started: 1,
				succeeded: 0,
				failed: 0,
				startedPerSecond: new Array(WINDOW).fill(0),
				lastEventAt: T0,
			},
		]);

		tracker.recordEnded('wf', 'e1', 'success', T0 + 500);
		expect(tracker.snapshot(T0 + 500)[0]).toMatchObject({ running: 0, started: 1, succeeded: 1 });
	});

	it.each([
		['error', 1],
		['crashed', 1],
		['canceled', 0],
		['waiting', 0],
	] as const)('counts an end with status %s as %d failures', (status, failed) => {
		tracker.recordStarted('wf', 'e1', T0);
		tracker.recordEnded('wf', 'e1', status, T0);

		expect(tracker.snapshot(T0)[0]).toMatchObject({ running: 0, succeeded: 0, failed });
	});

	it('does not count a resumed run as a new run', () => {
		tracker.recordStarted('wf', 'e1', T0);
		tracker.recordEnded('wf', 'e1', 'waiting', T0);
		tracker.recordResumed('wf', 'e1', T0 + 1000);

		expect(tracker.snapshot(T0 + 1000)[0]).toMatchObject({ running: 1, started: 1 });
	});

	it('only counts events inside the window', () => {
		tracker.recordStarted('wf', 'old', T0);
		tracker.recordStarted('wf', 'new', T0 + 30_000);

		expect(tracker.snapshot(T0 + 30_000)[0].started).toBe(2);
		expect(tracker.snapshot(T0 + (WINDOW + 1) * 1000)[0].started).toBe(1);
	});

	it('reuses a ring slot after the window wraps', () => {
		tracker.recordStarted('wf', 'e1', T0);
		tracker.recordStarted('wf', 'e2', T0 + WINDOW * 1000);

		expect(tracker.snapshot(T0 + WINDOW * 1000)[0].started).toBe(1);
	});

	it('forgets quiet workflows and stale runs', () => {
		tracker.recordStarted('quiet', 'e1', T0);
		tracker.recordEnded('quiet', 'e1', 'success', T0);
		tracker.recordStarted('stuck', 'e2', T0);

		expect(tracker.snapshot(T0 + (WINDOW + 1) * 1000).map((a) => a.workflowId)).toEqual(['stuck']);
		expect(tracker.snapshot(T0 + MAX_RUNNING + 1)).toEqual([]);
	});

	it('gives starts for each full second, oldest first', () => {
		// 5 starts each second for 10 s, then 15 each second for 10 s.
		for (let second = 0; second < 20; second++) {
			const perSecond = second < 10 ? 5 : 15;
			for (let i = 0; i < perSecond; i++) {
				tracker.recordStarted('wf', `e-${second}-${i}`, T0 + second * 1000 + i);
			}
		}

		const series = tracker.snapshot(T0 + 20_000)[0].startedPerSecond;

		expect(series).toHaveLength(WINDOW);
		expect(series.slice(-20)).toEqual([...new Array(10).fill(5), ...new Array(10).fill(15)]);
		expect(series.slice(0, WINDOW - 20).every((count) => count === 0)).toBe(true);
	});

	it('leaves the current second out of the series', () => {
		tracker.recordStarted('wf', 'e1', T0 + 1_000);
		tracker.recordStarted('wf', 'e2', T0 + 1_500);

		const [activity] = tracker.snapshot(T0 + 1_900);

		expect(activity.started).toBe(2);
		expect(activity.startedPerSecond.reduce((a, b) => a + b, 0)).toBe(0);
		expect(tracker.snapshot(T0 + 2_000)[0].startedPerSecond.at(-1)).toBe(2);
	});

	it('keeps the oldest full second when the current second has starts', () => {
		tracker.recordStarted('wf', 'old', T0);
		tracker.recordStarted('wf', 'now', T0 + WINDOW * 1000);

		const [activity] = tracker.snapshot(T0 + WINDOW * 1000);

		expect(activity.startedPerSecond[0]).toBe(1);
	});
});
