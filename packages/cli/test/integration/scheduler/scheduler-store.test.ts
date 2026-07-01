import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { SchedulerStore } from '@n8n/scheduler';

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

	describe('getDueJobs', () => {
		it('returns due jobs ordered by nextRunAt, capped at limit', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			// Insert out of nextRunAt order so the result proves ORDER BY, not insertion order.
			const dueLate = await createJob({ nextRunAt: new Date('2026-06-01T11:00:00.000Z') });
			const dueEarly = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			await createJob({ nextRunAt: new Date('2026-06-01T11:30:00.000Z') }); // due, but past the limit

			const due = await store.transaction(async (trx) => await store.getDueJobs(trx, now, 2));

			expect(due.map((j) => j.id)).toEqual([String(dueEarly.id), String(dueLate.id)]);
		});

		it('includes a job due exactly at now (inclusive boundary)', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const boundary = await createJob({ nextRunAt: now });

			const due = await store.transaction(async (trx) => await store.getDueJobs(trx, now, 100));

			expect(due.map((j) => j.id)).toContain(String(boundary.id));
		});

		it('excludes disabled, future, and null-nextRunAt jobs', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			await createJob({ enabled: false, nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			await createJob({ nextRunAt: new Date('2026-06-01T13:00:00.000Z') });
			await createJob({ nextRunAt: null });

			const due = await store.transaction(async (trx) => await store.getDueJobs(trx, now, 100));

			expect(due).toHaveLength(0);
		});

		it('reads each schedule kind back from its columns', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const due = new Date('2026-06-01T10:00:00.000Z');
			const fireAt = new Date('2026-06-01T09:00:00.000Z');
			const cron = await createJob({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
				intervalSeconds: null,
				nextRunAt: due,
			});
			const interval = await createJob({ kind: 'interval', intervalSeconds: 30, nextRunAt: due });
			const oneOff = await createJob({
				kind: 'one_off',
				intervalSeconds: null,
				fireAt,
				nextRunAt: due,
			});

			const jobs = await store.transaction(async (trx) => await store.getDueJobs(trx, now, 100));
			const scheduleById = new Map(jobs.map((j) => [j.id, j.schedule]));

			expect(scheduleById.get(String(cron.id))).toEqual({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
			});
			expect(scheduleById.get(String(interval.id))).toEqual({
				kind: 'interval',
				intervalSeconds: 30,
			});
			expect(scheduleById.get(String(oneOff.id))).toEqual({ kind: 'one_off', fireAt });
		});
	});

	describe('saveJob', () => {
		it('persists nextRunAt and lastFiredAt', async () => {
			const job = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });
			const nextRunAt = new Date('2026-06-01T11:00:00.000Z');
			const lastFiredAt = new Date('2026-06-01T10:00:00.000Z');

			await store.transaction(async (trx) => {
				await store.saveJob(trx, {
					id: String(job.id),
					schedule: { kind: 'interval', intervalSeconds: 60 },
					enabled: true,
					nextRunAt,
					lastFiredAt,
					taskType: 'scheduleTrigger',
					payload: {},
					maxAttempts: 1,
				});
			});

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toEqual(nextRunAt);
			expect(reloaded.lastFiredAt).toEqual(lastFiredAt);
		});

		it('clears nextRunAt so the job drops out of the sweep', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			const job = await createJob({ nextRunAt: new Date('2026-06-01T10:00:00.000Z') });

			await store.transaction(async (trx) => {
				await store.saveJob(trx, {
					id: String(job.id),
					schedule: { kind: 'interval', intervalSeconds: 60 },
					enabled: true,
					nextRunAt: null,
					lastFiredAt: new Date('2026-06-01T10:00:00.000Z'),
					taskType: 'scheduleTrigger',
					payload: {},
					maxAttempts: 1,
				});
			});

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toBeNull();

			const due = await store.transaction(async (trx) => await store.getDueJobs(trx, now, 100));
			expect(due.map((j) => j.id)).not.toContain(String(job.id));
		});
	});

	describe('transaction', () => {
		it('rolls back all writes when the callback throws', async () => {
			const nextRunAt = new Date('2026-06-01T10:00:00.000Z');
			const job = await createJob({ nextRunAt });
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');

			await expect(
				store.transaction(async (trx) => {
					await store.createTask(trx, {
						id: 'ignored',
						jobId: String(job.id),
						taskType: 'scheduleTrigger',
						payload: {},
						scheduledFor,
						runAt: scheduledFor,
						status: 'pending',
						attempts: 0,
						maxAttempts: 1,
					});
					await store.saveJob(trx, {
						id: String(job.id),
						schedule: { kind: 'interval', intervalSeconds: 60 },
						enabled: true,
						nextRunAt: new Date('2026-06-01T11:00:00.000Z'),
						lastFiredAt: new Date('2026-06-01T10:00:00.000Z'),
						taskType: 'scheduleTrigger',
						payload: {},
						maxAttempts: 1,
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

	describe('createTask', () => {
		it('inserts an occurrence', async () => {
			const job = await createJob();
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');

			await store.transaction(async (trx) => {
				await store.createTask(trx, {
					id: 'ignored',
					jobId: String(job.id),
					taskType: 'scheduleTrigger',
					payload: { foo: 'bar' },
					scheduledFor,
					runAt: scheduledFor,
					status: 'pending',
					attempts: 0,
					maxAttempts: 1,
				});
			});

			const tasks = await taskRepository.findBy({ jobId: job.id });
			expect(tasks).toHaveLength(1);
			expect(tasks[0].scheduledFor).toEqual(scheduledFor);
		});

		it('is idempotent on (jobId, scheduledFor): a duplicate is a no-op', async () => {
			const job = await createJob();
			const scheduledFor = new Date('2026-06-01T12:00:00.000Z');
			const task = {
				id: 'ignored',
				jobId: String(job.id),
				taskType: 'scheduleTrigger',
				payload: {},
				scheduledFor,
				runAt: scheduledFor,
				status: 'pending' as const,
				attempts: 0,
				maxAttempts: 1,
			};

			await store.transaction(async (trx) => await store.createTask(trx, task));
			await store.transaction(async (trx) => await store.createTask(trx, task));

			const tasks = await taskRepository.findBy({ jobId: job.id });
			expect(tasks).toHaveLength(1);
		});
	});
});
