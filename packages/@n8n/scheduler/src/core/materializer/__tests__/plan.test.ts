import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import { CorruptStorageRowError } from '../../errors';
import type { ScheduledJob } from '../../types';
import { planOccurrences } from '../plan';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const secondsAfter = (base: Date, seconds: number) => new Date(base.getTime() + seconds * 1000);
const secondsBefore = (base: Date, seconds: number) => secondsAfter(base, -seconds);

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
	recurrenceUnit: null,
	recurrenceSize: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
	misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
	misfireGraceSeconds: 60,
	ownerKey: 'owner-1',
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

	it('thins a recurring_cron anchor by its every-Nth-period gate across a window', () => {
		// "Every 2 weeks on Monday and Wednesday at midnight UTC." The anchor fires
		// every Mon and Wed; the weeks gate keeps both days of an on-cadence week
		// (the Monday and its same-week Wednesday) and skips the week in between.
		const firstMonday = new Date('2026-01-05T00:00:00.000Z'); // first Monday of 2026
		const job = makeJob({
			kind: 'recurring_cron',
			cronExpression: '0 0 0 * * 1,3',
			timezone: 'UTC',
			intervalSeconds: null,
			recurrenceUnit: 'weeks',
			recurrenceSize: 2,
			nextRunAt: firstMonday,
		});

		// Window runs through the Wednesday two weeks on (the fourth recorded fire).
		const windowEnd = new Date('2026-01-21T00:00:00.000Z');
		const windowSeconds = (windowEnd.getTime() - firstMonday.getTime()) / 1000;

		const plan = planOccurrences(job, firstMonday, { ...options, windowSeconds });

		expect(plan.occurrences).toEqual([
			new Date('2026-01-05T00:00:00.000Z'), // Mon, week 1
			new Date('2026-01-07T00:00:00.000Z'), // Wed, week 1 (same-period refire)
			new Date('2026-01-19T00:00:00.000Z'), // Mon, week 3 (week 2 skipped by the gate)
			new Date('2026-01-21T00:00:00.000Z'), // Wed, week 3
		]);
		// Two weeks on again: week 5's Monday, with week 4 skipped.
		expect(plan.nextRunAt).toEqual(new Date('2026-02-02T00:00:00.000Z'));
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

describe('planOccurrences misfire handling', () => {
	// A job whose clock stopped two minutes ago: fires every 10s from NOW-120s, giving
	// 13 due instants ending at NOW. With a 60s grace, the 7 at or before NOW-60s are
	// past their deadline.
	const backloggedJob = (overrides: Partial<ScheduledJob> = {}) =>
		makeJob({ nextRunAt: secondsBefore(NOW, 120), ...overrides });

	const skipPolicy = { misfirePolicy: ScheduledJobMisfirePolicy.Skip };

	it('records a single catch-up run under coalesce', () => {
		const plan = planOccurrences(backloggedJob(), NOW, options);

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.skippedOccurrences).toBe(12);
	});

	it('records nothing under skip', () => {
		const plan = planOccurrences(backloggedJob(skipPolicy), NOW, options);

		expect(plan.occurrences).toEqual([]);
		expect(plan.skippedOccurrences).toBe(13);
	});

	it('keeps the occurrences still ahead of now, whatever the policy', () => {
		// A window reaching 30s past NOW, so the pass also holds three future instants.
		const ahead = { ...options, windowSeconds: 30 };
		const future = [secondsAfter(NOW, 10), secondsAfter(NOW, 20), secondsAfter(NOW, 30)];

		const coalesced = planOccurrences(backloggedJob(), NOW, ahead);
		const skipped = planOccurrences(backloggedJob(skipPolicy), NOW, ahead);

		expect(coalesced.occurrences).toEqual([NOW, ...future]);
		expect(skipped.occurrences).toEqual(future);
	});

	it('advances the clock past the discarded occurrences whatever the policy', () => {
		const coalesced = planOccurrences(backloggedJob(), NOW, options);
		const skipped = planOccurrences(backloggedJob(skipPolicy), NOW, options);

		expect(coalesced.nextRunAt).toEqual(secondsAfter(NOW, 10));
		expect(skipped.nextRunAt).toEqual(coalesced.nextRunAt);
		expect(coalesced.lastFiredAt).toEqual(NOW);
		expect(skipped.lastFiredAt).toEqual(coalesced.lastFiredAt);
	});

	it('treats an occurrence exactly at its deadline as missed', () => {
		// Skip, not coalesce: under coalesce the boundary instant would still be
		// recorded as the catch-up run either way, hiding whether it counted as missed.
		const job = makeJob({ ...skipPolicy, nextRunAt: secondsBefore(NOW, 60) });

		const plan = planOccurrences(job, NOW, options);

		expect(plan.occurrences).toEqual([]);
		expect(plan.skippedOccurrences).toBe(7);
	});

	it('leaves a pass whose occurrences are all inside their grace window alone', () => {
		// No policy applies, so even a late run is recorded as usual.
		const job = makeJob({ ...skipPolicy, nextRunAt: secondsBefore(NOW, 30) });

		const plan = planOccurrences(job, NOW, options);

		expect(plan.occurrences).toEqual([
			secondsBefore(NOW, 30),
			secondsBefore(NOW, 20),
			secondsBefore(NOW, 10),
			NOW,
		]);
		expect(plan.skippedOccurrences).toBe(0);
	});

	it('does not treat an on-time pass as a misfire', () => {
		const plan = planOccurrences(makeJob(), NOW, options);

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.skippedOccurrences).toBe(0);
	});

	it('defers the catch-up run while a capped backlog is still draining', () => {
		const plan = planOccurrences(backloggedJob(), NOW, { ...options, maxPerJob: 5 });

		expect(plan.occurrences).toEqual([]);
		expect(plan.skippedOccurrences).toBe(5);
		// The clock still advances, so the next pass resumes further down the backlog.
		expect(plan.nextRunAt).toEqual(secondsBefore(NOW, 70));
	});

	it('records the catch-up run when the walk fills the cap but the backlog ends there', () => {
		// Five instants and a cap of five, but nothing left in the window: the backlog
		// ran out, so this pass does hold the newest missed instant.
		const job = makeJob({ nextRunAt: secondsBefore(NOW, 40), misfireGraceSeconds: 20 });

		const plan = planOccurrences(job, NOW, { ...options, maxPerJob: 5 });

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.catchUpAt).toEqual(NOW);
		expect(plan.skippedOccurrences).toBe(4);
	});

	it('still fires a one-off that was missed, under coalesce', () => {
		// The one-off's only instant is also its catch-up run, so coalesce keeps it.
		const fireAt = secondsBefore(NOW, 3600);
		const job = makeJob({ kind: 'one_off', intervalSeconds: null, fireAt, nextRunAt: fireAt });

		const plan = planOccurrences(job, NOW, options);

		expect(plan.occurrences).toEqual([fireAt]);
		expect(plan.nextRunAt).toBeNull();
	});

	it('drops a missed one-off entirely under skip', () => {
		const fireAt = secondsBefore(NOW, 3600);
		const job = makeJob({
			...skipPolicy,
			kind: 'one_off',
			intervalSeconds: null,
			fireAt,
			nextRunAt: fireAt,
		});

		const plan = planOccurrences(job, NOW, options);

		expect(plan.occurrences).toEqual([]);
		expect(plan.nextRunAt).toBeNull();
		expect(plan.skippedOccurrences).toBe(1);
	});

	it('defers a job whose stored policy this version does not know', () => {
		const job = makeJob({
			nextRunAt: secondsBefore(NOW, 120),
			misfirePolicy: 'fire_all' as ScheduledJobMisfirePolicy,
		});

		// Throwing puts the job through the materializer's per-job defer path rather
		// than silently reading an unknown policy as the most destructive one.
		expect(() => planOccurrences(job, NOW, options)).toThrow(CorruptStorageRowError);
	});

	// Known gap, not yet fixed: `it.fails` so this turns red (telling us to remove
	// the modifier) the day someone closes it, instead of silently staying green.
	it.fails(
		'eventually fires a catch-up under coalesce when production outpaces the drain rate',
		() => {
			// A 1s-interval job outrunning a pass that can only drain 1000 occurrences
			// (maxPerJob) per materialization cycle: 2000s of new backlog accrues between
			// passes, so every pass's walk hits maxPerJob before reaching `now`
			// (truncated) with nothing ahead, and coalesce keeps deferring instead of
			// firing the newest missed instant. The job never reaches its backlog's tail,
			// so it never runs again: silently, with no warning at any point.
			const job = makeJob({ intervalSeconds: 1 });
			let now = NOW;
			let nextRunAt = job.nextRunAt!;
			let firedAtLeastOnce = false;

			for (let pass = 0; pass < 30; pass++) {
				now = secondsAfter(now, 2000);
				const plan = planOccurrences({ ...job, nextRunAt }, now, {
					windowSeconds: 60,
					maxPerJob: 1000,
					defaultTimezone: 'UTC',
				});
				if (plan.occurrences.length > 0) firedAtLeastOnce = true;
				nextRunAt = plan.nextRunAt!;
			}

			expect(firedAtLeastOnce).toBe(true);
		},
	);
});
