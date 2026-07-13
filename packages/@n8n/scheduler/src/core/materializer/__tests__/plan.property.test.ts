import fc from 'fast-check';
import type { CronExpression } from 'n8n-workflow';

import type { ScheduledJob } from '../../types';
import { planOccurrences } from '../plan';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeIntervalJob = (intervalSeconds: number): ScheduledJob => ({
	id: 1,
	taskType: 'test',
	payload: {},
	kind: 'interval',
	cronExpression: null,
	timezone: null,
	intervalSeconds,
	fireAt: null,
	recurrenceUnit: null,
	recurrenceSize: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
});

const makeCronJob = (cronExpression: string, timezone: string): ScheduledJob => ({
	id: 2,
	taskType: 'test',
	payload: {},
	kind: 'cron',
	cronExpression: cronExpression as CronExpression,
	timezone,
	intervalSeconds: null,
	fireAt: null,
	recurrenceUnit: null,
	recurrenceSize: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
});

const makeOneOffJob = (fireAt: Date): ScheduledJob => ({
	id: 3,
	taskType: 'test',
	payload: {},
	kind: 'one_off',
	cronExpression: null,
	timezone: null,
	intervalSeconds: null,
	fireAt,
	recurrenceUnit: null,
	recurrenceSize: null,
	// A fresh one-off job is due exactly at its fireAt: the materializer's
	// index only ever surfaces it once that instant is reached.
	nextRunAt: fireAt,
	lastFiredAt: null,
	maxAttempts: 1,
});

/**
 * The recurring-schedule planning invariants, shared by the interval and cron
 * properties: occurrences stay ordered, inside the window, bounded, start at
 * the job's due instant, and the returned cursor is a faithful continuation.
 */
function assertPlanInvariants(
	plan: ReturnType<typeof planOccurrences>,
	job: ScheduledJob,
	windowEnd: number,
	maxPerJob: number,
): void {
	expect(plan.occurrences.length).toBeLessThanOrEqual(maxPerJob);

	for (let i = 1; i < plan.occurrences.length; i++) {
		expect(plan.occurrences[i].getTime()).toBeGreaterThan(plan.occurrences[i - 1].getTime());
	}
	for (const occurrence of plan.occurrences) {
		expect(occurrence.getTime()).toBeLessThanOrEqual(windowEnd);
	}

	// The first recorded occurrence is always the job's due instant (an
	// occurrence can only exist when the starting cursor was non-null).
	if (plan.occurrences.length > 0) {
		expect(plan.occurrences[0].getTime()).toBe(job.nextRunAt!.getTime());
	}

	// lastFiredAt tracks the newest occurrence, or the prior value if none.
	expect(plan.lastFiredAt).toEqual(plan.occurrences.at(-1) ?? job.lastFiredAt);

	// When the plan stopped before the cap, the cursor must be exhausted or
	// genuinely past the window, i.e. nothing runnable was skipped.
	if (plan.occurrences.length < maxPerJob) {
		expect(plan.nextRunAt === null || plan.nextRunAt.getTime() > windowEnd).toBe(true);
	}
}

describe('planOccurrences (fast-check)', () => {
	it('produces an ordered, in-window, bounded plan with a faithful cursor', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 3600 }),
				fc.integer({ min: 0, max: 7200 }),
				fc.integer({ min: 1, max: 50 }),
				(intervalSeconds, windowSeconds, maxPerJob) => {
					const job = makeIntervalJob(intervalSeconds);
					const plan = planOccurrences(job, NOW, {
						windowSeconds,
						maxPerJob,
						defaultTimezone: 'UTC',
					});
					assertPlanInvariants(plan, job, NOW.getTime() + windowSeconds * 1000, maxPerJob);
				},
			),
		);
	});

	const arbCron = fc.constantFrom<string>(
		'0 * * * * *',
		'0 0 * * * *',
		'0 0 0 * * *',
		'0 30 9 * * 1-5',
		'0 0 0 1 * *',
	);
	const arbTimezone = fc.constantFrom(
		'UTC',
		'Europe/Berlin',
		'America/New_York',
		'Asia/Kolkata',
		'Pacific/Auckland',
	);

	it('produces an ordered, in-window, bounded plan for a cron job in any supported timezone', () => {
		fc.assert(
			fc.property(
				arbCron,
				arbTimezone,
				// Up to ~30 days: wide enough that a sparse monthly cron can still fire,
				// capped low by maxPerJob so the loop stays cheap regardless.
				fc.integer({ min: 0, max: 30 * 24 * 3600 }),
				fc.integer({ min: 1, max: 20 }),
				(cronExpression, timezone, windowSeconds, maxPerJob) => {
					const job = makeCronJob(cronExpression, timezone);
					const plan = planOccurrences(job, NOW, {
						windowSeconds,
						maxPerJob,
						defaultTimezone: 'UTC',
					});
					assertPlanInvariants(plan, job, NOW.getTime() + windowSeconds * 1000, maxPerJob);
				},
			),
		);
	});

	it('fires a one-off job at most once, only when its due instant falls within the window', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -3600, max: 2 * 7200 }),
				fc.integer({ min: 0, max: 7200 }),
				(fireOffsetSeconds, windowSeconds) => {
					const fireAt = new Date(NOW.getTime() + fireOffsetSeconds * 1000);
					const job = makeOneOffJob(fireAt);
					const plan = planOccurrences(job, NOW, {
						windowSeconds,
						maxPerJob: 50,
						defaultTimezone: 'UTC',
					});
					const windowEnd = NOW.getTime() + windowSeconds * 1000;

					expect(plan.occurrences.length).toBeLessThanOrEqual(1);

					if (fireAt.getTime() <= windowEnd) {
						// Recorded, and the schedule is exhausted: no more fires to plan next.
						expect(plan.occurrences).toEqual([fireAt]);
						expect(plan.nextRunAt).toBeNull();
					} else {
						// Past the window: nothing recorded, and the job's clock is untouched.
						expect(plan.occurrences).toEqual([]);
						expect(plan.nextRunAt).toEqual(fireAt);
					}
				},
			),
		);
	});
});
