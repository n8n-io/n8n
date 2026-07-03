import type { Schedule, ScheduledJob } from '../../types';
import { planOccurrences } from '../plan';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const secondsAfter = (base: Date, seconds: number) => new Date(base.getTime() + seconds * 1000);

const makeJob = (schedule: Schedule, nextRunAt: Date | null): ScheduledJob => ({
	id: '1',
	taskType: 'test',
	payload: {},
	schedule,
	enabled: true,
	nextRunAt,
	lastFiredAt: null,
	maxAttempts: 1,
});

const every: Schedule = { kind: 'interval', intervalSeconds: 10 };

describe('planOccurrences', () => {
	it('records the due occurrence and advances the clock past it', () => {
		const job = makeJob(every, NOW);

		const plan = planOccurrences(job, NOW, { windowSeconds: 0, maxPerJob: 100 });

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 10));
		expect(plan.lastFiredAt).toEqual(NOW);
	});

	it('records every occurrence within the window, ahead of time', () => {
		const job = makeJob(every, NOW);

		const plan = planOccurrences(job, NOW, { windowSeconds: 60, maxPerJob: 100 });

		// The due fire plus every 10s up to and including now + 60s.
		expect(plan.occurrences).toHaveLength(7);
		expect(plan.occurrences.at(-1)).toEqual(secondsAfter(NOW, 60));
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 70));
	});

	it('caps at maxPerJob and resumes from the first uncounted occurrence', () => {
		const job = makeJob(every, NOW);

		const plan = planOccurrences(job, NOW, { windowSeconds: 3600, maxPerJob: 3 });

		expect(plan.occurrences).toEqual([NOW, secondsAfter(NOW, 10), secondsAfter(NOW, 20)]);
		// The 4th occurrence is still within the window, so the next pass continues from it.
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 30));
	});

	it('exhausts a one-off: records it once, then no next run', () => {
		const job = makeJob({ kind: 'one_off', fireAt: NOW }, NOW);

		const plan = planOccurrences(job, NOW, { windowSeconds: 60, maxPerJob: 100 });

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toBeNull();
	});

	it('follows a cron schedule and its timezone', () => {
		const schedule: Schedule = { kind: 'cron', cronExpression: '0 0 0 * * *', timezone: 'UTC' };
		const job = makeJob(schedule, NOW);

		const plan = planOccurrences(job, NOW, { windowSeconds: 0, maxPerJob: 100 });

		expect(plan.occurrences).toEqual([NOW]);
		expect(plan.nextRunAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
	});

	it('does nothing when the next run is past the window (a defensive no-op)', () => {
		const job = { ...makeJob(every, secondsAfter(NOW, 120)), lastFiredAt: NOW };

		const plan = planOccurrences(job, NOW, { windowSeconds: 60, maxPerJob: 100 });

		expect(plan.occurrences).toEqual([]);
		expect(plan.nextRunAt).toEqual(secondsAfter(NOW, 120));
		expect(plan.lastFiredAt).toEqual(NOW);
	});

	it('does nothing when the job has no next run', () => {
		const job = makeJob(every, null);

		const plan = planOccurrences(job, NOW, { windowSeconds: 60, maxPerJob: 100 });

		expect(plan.occurrences).toEqual([]);
		expect(plan.nextRunAt).toBeNull();
	});
});
