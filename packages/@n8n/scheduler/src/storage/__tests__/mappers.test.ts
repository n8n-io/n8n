import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';

import { entityToScheduledJob, scheduledTaskToRow } from '../mappers';

/** Build a `scheduled_job` entity row with sensible defaults, overridable per test. */
function jobEntity(overrides: Partial<ScheduledJobEntity> = {}): ScheduledJobEntity {
	return {
		id: 1,
		name: 'job-1',
		workflowId: null,
		nodeId: null,
		taskType: 'scheduleTrigger',
		payload: {},
		kind: 'interval',
		cronExpression: null,
		timezone: null,
		intervalSeconds: 60,
		fireAt: null,
		enabled: true,
		nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
		lastFiredAt: null,
		maxAttempts: 1,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides,
	} as ScheduledJobEntity;
}

describe('entityToScheduledJob', () => {
	it('assembles a cron schedule from the flat columns', () => {
		const job = entityToScheduledJob(
			jobEntity({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
				intervalSeconds: null,
			}),
		);

		expect(job.schedule).toEqual({
			kind: 'cron',
			cronExpression: '0 0 9 * * *',
			timezone: 'Europe/Berlin',
		});
	});

	it('assembles an interval schedule', () => {
		const job = entityToScheduledJob(jobEntity({ kind: 'interval', intervalSeconds: 30 }));

		expect(job.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
	});

	it('assembles a one_off schedule', () => {
		const fireAt = new Date('2026-06-01T12:00:00.000Z');
		const job = entityToScheduledJob(jobEntity({ kind: 'one_off', intervalSeconds: null, fireAt }));

		expect(job.schedule).toEqual({ kind: 'one_off', fireAt });
	});

	it('stringifies the numeric id and passes scheduling state through (incl. nulls)', () => {
		const nextRunAt = new Date('2026-02-02T00:00:00.000Z');
		const job = entityToScheduledJob(
			jobEntity({ id: 123, enabled: false, nextRunAt, lastFiredAt: null }),
		);

		expect(job.id).toBe('123');
		expect(job.enabled).toBe(false);
		expect(job.nextRunAt).toBe(nextRunAt);
		expect(job.lastFiredAt).toBeNull();
	});

	it('throws when a column required by the kind is missing', () => {
		expect(() =>
			entityToScheduledJob(jobEntity({ kind: 'interval', intervalSeconds: null })),
		).toThrow();
	});
});

describe('scheduledTaskToRow', () => {
	it('converts jobId to a number and omits the generated id', () => {
		const scheduledFor = new Date('2026-03-03T00:00:00.000Z');
		const row = scheduledTaskToRow({
			id: 'ignored',
			jobId: '8',
			taskType: 'scheduleTrigger',
			payload: { a: 1 },
			scheduledFor,
			runAt: scheduledFor,
			status: 'pending',
			attempts: 0,
			maxAttempts: 3,
		});

		expect(row).not.toHaveProperty('id');
		expect(row.jobId).toBe(8);
		expect(row.scheduledFor).toBe(scheduledFor);
		expect(row.maxAttempts).toBe(3);
	});
});
