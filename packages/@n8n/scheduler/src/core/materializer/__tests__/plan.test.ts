import type { ScheduledJob } from '../../types';
import { planOccurrences } from '../plan';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const secondsAfter = (base: Date, seconds: number) => new Date(base.getTime() + seconds * 1000);

/** An every-10s interval job due at NOW, overridable per test. */
const makeJob = (overrides: Partial<ScheduledJob> = {}): ScheduledJob => ({
	id: 1,
	taskType: 'test',
	payload: {},
	kind: 'interval',
	cronExpression: null,
	timezone: null,
	intervalSeconds: 10,
	fireAt: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
	...overrides,
});

const options = { windowSeconds: 0, maxPerJob: 100, defaultTimezone: 'UTC' };

describe('planOccurrences', () => {
	it('records the due occurrence and advances the clock past it', () => {
		const plan = planOccurrences(makeJob(), NOW, options);

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 10));
		expect(plan.lastFiredAt).toEqual(NOW);
	});

	it('records every occurrence within the window, ahead of time', () => {
		const plan = planOccurrences(makeJob(), NOW, { ...options, windowSeconds: 60 });

		// The due fire plus every 10s up to and including now + 60s.
		expect(plan.occurrences).toHaveLength(7);
		expect(plan.occurrences.at(-1)).toEqual(secondsAfter(NOW, 60));
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 70));
	});

	it('caps at maxPerJob and resumes from the first uncounted occurrence', () => {
		const plan = planOccurrences(makeJob(), NOW, {
			...options,
			windowSeconds: 3600,
			maxPerJob: 3,
		});

		expect(plan.occurrences).toEqual([NOW, secondsAfter(NOW, 10), secondsAfter(NOW, 20)]);
		// The 4th occurrence is still within the window, so the next pass continues from it.
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 30));
	});

	it('exhausts a one-off: records it once, then no next run', () => {
		const job = makeJob({ kind: 'one_off', intervalSeconds: null, fireAt: NOW });

		const plan = planOccurrences(job, NOW, { ...options, windowSeconds: 60 });

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toBeNull();
	});

	it('follows a cron schedule and its timezone', () => {
		const job = makeJob({
			kind: 'cron',
			cronExpression: '0 0 0 * * *',
			timezone: 'UTC',
			intervalSeconds: null,
		});

		const plan = planOccurrences(job, NOW, options);

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
	});

	it('evaluates a cron job with a null timezone in the default timezone', () => {
		const job = makeJob({
			kind: 'cron',
			cronExpression: '0 0 9 * * *', // 9am local
			timezone: null,
			intervalSeconds: null,
		});

		const plan = planOccurrences(job, NOW, { ...options, defaultTimezone: 'Europe/Berlin' });

		// 9am Berlin (UTC+1 in January) is 8am UTC.
		expect(plan.nextRunAt).toEqual(new Date('2026-01-01T08:00:00.000Z'));
	});

	it('does nothing when the next run is past the window', () => {
		const job = makeJob({ nextRunAt: secondsAfter(NOW, 120), lastFiredAt: NOW });

		const plan = planOccurrences(job, NOW, { ...options, windowSeconds: 60 });

		expect(plan.occurrences).toEqual([]);
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 120));
		expect(plan.lastFiredAt).toEqual(NOW);
	});

	it('does nothing when the job has no next run', () => {
		const plan = planOccurrences(makeJob({ nextRunAt: null }), NOW, {
			...options,
			windowSeconds: 60,
		});

		expect(plan.occurrences).toEqual([]);
		expect(plan.nextRunAt).toBeNull();
	});
});
