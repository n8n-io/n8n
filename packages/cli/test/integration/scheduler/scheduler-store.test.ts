import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { SchedulerStore } from '@n8n/scheduler/storage';

describe('SchedulerStore', () => {
	let store: SchedulerStore;
	let jobRepository: ScheduledJobRepository;
	let taskRepository: ScheduledTaskRepository;

	beforeAll(async () => {
		await testDb.init();
		store = Container.get(SchedulerStore);
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Insert a system interval job (null workflowId), return the saved entity. */
	async function createJob(
		overrides: Partial<ScheduledJobEntity> = {},
	): Promise<ScheduledJobEntity> {
		return await jobRepository.save(
			jobRepository.create({
				name: `job-${Math.random().toString(36).slice(2)}`,
				workflowId: null,
				nodeId: null,
				taskType: 'scheduleTrigger',
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
				maxAttempts: 1,
				...overrides,
			}),
		);
	}

	describe('transaction', () => {
		it('commits repository calls made through the transaction manager', async () => {
			const job = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			const nextRunAt = new Date('2026-06-01T11:00:00.000Z');
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');

			await store.transaction(async (trx) => {
				await jobRepository.updateSchedulingState(trx, job.id, {
					nextRunAt,
					lastFiredAt: scheduledFor,
				});
				await taskRepository.insertOccurrence(trx, {
					jobId: job.id,
					taskType: 'scheduleTrigger',
					payload: {},
					scheduledFor,
					runAt: scheduledFor,
					status: 'pending',
					attempts: 0,
					maxAttempts: 1,
				});
			});

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toEqual(nextRunAt);
			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
		});

		it('rolls back all writes when the callback throws', async () => {
			const nextRunAt = new Date('2026-06-01T10:00:00.000Z');
			const job = await createJob({ nextRunAt });
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');

			await expect(
				store.transaction(async (trx) => {
					await taskRepository.insertOccurrence(trx, {
						jobId: job.id,
						taskType: 'scheduleTrigger',
						payload: {},
						scheduledFor,
						runAt: scheduledFor,
						status: 'pending',
						attempts: 0,
						maxAttempts: 1,
					});
					await jobRepository.updateSchedulingState(trx, job.id, {
						nextRunAt: new Date('2026-06-01T11:00:00.000Z'),
						lastFiredAt: new Date('2026-06-01T10:00:00.000Z'),
					});
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			// Neither the occurrence nor the schedule advance survived.
			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(0);
			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toEqual(nextRunAt);
			expect(reloaded.lastFiredAt).toBeNull();
		});
	});

	describe('ScheduledJobRepository.findDue', () => {
		it('returns due jobs ordered by nextRunAt, capped at limit', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			// Insert out of nextRunAt order so the result proves ORDER BY, not insertion order.
			const dueLate = await createJob({ nextRunAt: new Date('2026-06-01T11:00:00.000Z') });
			const dueEarly = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			await createJob({ nextRunAt: new Date('2026-06-01T11:30:00.000Z') }); // due, but past the limit

			const due = await store.transaction(async (trx) => await jobRepository.findDue(trx, now, 2));

			expect(due.map((j) => j.id)).toEqual([dueEarly.id, dueLate.id]);
		});

		it('includes a job due exactly at now (inclusive boundary)', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const boundary = await createJob({ nextRunAt: now });

			const due = await store.transaction(
				async (trx) => await jobRepository.findDue(trx, now, 100),
			);

			expect(due.map((j) => j.id)).toContain(boundary.id);
		});

		it('excludes disabled, future, and null-nextRunAt jobs', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			await createJob({ enabled: false, nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			await createJob({ nextRunAt: new Date('2026-06-01T13:00:00.000Z') });
			await createJob({ nextRunAt: null });

			const due = await store.transaction(
				async (trx) => await jobRepository.findDue(trx, now, 100),
			);

			expect(due).toHaveLength(0);
		});

		it('persists and reads back each schedule kind from its columns', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const dueAt = new Date('2026-06-01T10:00:00.000Z');
			const fireAt = new Date('2026-06-01T09:00:00.000Z');
			const cron = await createJob({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
				intervalSeconds: null,
				nextRunAt: dueAt,
			});
			const interval = await createJob({ kind: 'interval', intervalSeconds: 30, nextRunAt: dueAt });
			const oneOff = await createJob({
				kind: 'one_off',
				intervalSeconds: null,
				fireAt,
				nextRunAt: dueAt,
			});

			const due = await store.transaction(
				async (trx) => await jobRepository.findDue(trx, now, 100),
			);
			const byId = new Map(due.map((j) => [j.id, j]));

			expect(byId.get(cron.id)).toMatchObject({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
			});
			expect(byId.get(interval.id)).toMatchObject({ kind: 'interval', intervalSeconds: 30 });
			expect(byId.get(oneOff.id)).toMatchObject({ kind: 'one_off', fireAt });
		});
	});

	describe('ScheduledJobRepository.updateSchedulingState', () => {
		it('persists nextRunAt and lastFiredAt', async () => {
			const job = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			const nextRunAt = new Date('2026-06-01T11:00:00.000Z');
			const lastFiredAt = new Date('2026-06-01T10:00:00.000Z');

			await store.transaction(
				async (trx) =>
					await jobRepository.updateSchedulingState(trx, job.id, { nextRunAt, lastFiredAt }),
			);

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toEqual(nextRunAt);
			expect(reloaded.lastFiredAt).toEqual(lastFiredAt);
		});

		it('clears nextRunAt so the job drops out of the due read', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const job = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });

			await store.transaction(
				async (trx) =>
					await jobRepository.updateSchedulingState(trx, job.id, {
						nextRunAt: null,
						lastFiredAt: new Date('2026-06-01T10:00:00.000Z'),
					}),
			);

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toBeNull();

			const due = await store.transaction(
				async (trx) => await jobRepository.findDue(trx, now, 100),
			);
			expect(due.map((j) => j.id)).not.toContain(job.id);
		});
	});

	describe('ScheduledTaskRepository.insertOccurrence', () => {
		it('inserts an occurrence', async () => {
			const job = await createJob();
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');

			await store.transaction(
				async (trx) =>
					await taskRepository.insertOccurrence(trx, {
						jobId: job.id,
						taskType: 'scheduleTrigger',
						payload: { foo: 'bar' },
						scheduledFor,
						runAt: scheduledFor,
						status: 'pending',
						attempts: 0,
						maxAttempts: 1,
					}),
			);

			const stored = await taskRepository.findBy({ jobId: job.id });
			expect(stored).toHaveLength(1);
			expect(stored[0].scheduledFor).toEqual(scheduledFor);
		});

		it('is idempotent on (jobId, scheduledFor): a duplicate is a no-op', async () => {
			const job = await createJob();
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');
			const occurrence = {
				jobId: job.id,
				taskType: 'scheduleTrigger',
				payload: {},
				scheduledFor,
				runAt: scheduledFor,
				status: 'pending' as const,
				attempts: 0,
				maxAttempts: 1,
			};

			await store.transaction(
				async (trx) => await taskRepository.insertOccurrence(trx, occurrence),
			);
			await store.transaction(
				async (trx) => await taskRepository.insertOccurrence(trx, occurrence),
			);

			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
		});
	});
});
