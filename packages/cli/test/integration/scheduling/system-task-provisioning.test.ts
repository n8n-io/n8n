import { testDb } from '@n8n/backend-test-utils';
import { ScheduledJobMisfirePolicy, ScheduledJobOwnerType } from '@n8n/constants';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SystemTask, SystemTaskSchedule } from '@n8n/decorators';
import { UnregisteredOwnerTypeError } from '@n8n/scheduler';

import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { systemTaskProvisionRequest } from '@/scheduling/system-tasks/system-task-job';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';

/**
 * System task provisioning against real rows, on both dialects. The unit tests
 * pin the request; this pins the rows it writes, the occurrence seeded inside
 * the transaction, and the convergence of two mains provisioning at once.
 */
describe('system task provisioning', () => {
	const TASK_NAME = 'integration-provisioning';
	const JOB_NAME = `system:${TASK_NAME}`;

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let owner: SystemTaskScheduledJobOwner;
	let provisioner: DurableJobProvisioner;

	const task = (over: Partial<SystemTask> = {}): SystemTask => ({
		name: TASK_NAME,
		schedule: { kind: 'interval', intervalSeconds: 60 },
		effects: 'idempotent',
		durable: true,
		run: async () => {},
		...over,
	});

	const provision = async (over: Partial<SystemTask> = {}) =>
		await provisioner.provision(systemTaskProvisionRequest(task(over), owner, 'UTC', new Date()));

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		owner = Container.get(SystemTaskScheduledJobOwner);
		provisioner = Container.get(DurableJobProvisioner);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('inserts one self-owned row and seeds its first occurrence', async () => {
		const before = new Date();

		const summary = await provision();

		expect(summary.inserted).toHaveLength(1);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row).toMatchObject({
			ownerType: ScheduledJobOwnerType.SystemTask,
			ownerId: TASK_NAME,
			ownerMemberId: null,
			taskType: JOB_NAME,
			payload: {},
			kind: 'interval',
			intervalSeconds: 60,
			maxAttempts: 3,
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds: 60,
		});
		expect(row.nextRunAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());

		const seeded = await taskRepo.findBy({ jobId: row.id });
		expect(seeded.length).toBeGreaterThan(0);
		expect(seeded.every((occurrence) => occurrence.status === 'pending')).toBe(true);
	});

	it('leaves an identical second provision alone, keeping the row and its occurrences', async () => {
		await provision();
		const inserted = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		const seeded = await taskRepo.countBy({ jobId: inserted.id });

		const summary = await provision();

		expect(summary.unchanged).toEqual([{ id: inserted.id, name: JOB_NAME }]);
		expect(summary.inserted).toEqual([]);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.id).toBe(inserted.id);
		expect(row.nextRunAt).toEqual(inserted.nextRunAt);
		expect(await taskRepo.countBy({ jobId: inserted.id })).toBe(seeded);
	});

	it('rewrites a changed cadence in place, withdrawing the occurrences of the old one', async () => {
		await provision();
		const inserted = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		const staleIds = (await taskRepo.findBy({ jobId: inserted.id })).map(
			(occurrence) => occurrence.id,
		);
		expect(staleIds.length).toBeGreaterThan(0);

		const schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 300 };
		const summary = await provision({ schedule });

		expect(summary.redefined).toEqual([{ id: inserted.id, name: JOB_NAME }]);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.id).toBe(inserted.id);
		expect(row.intervalSeconds).toBe(300);
		expect(row.nextRunAt?.getTime()).toBeGreaterThan(inserted.nextRunAt!.getTime());
		const remaining = await taskRepo.findBy({ jobId: row.id });
		expect(remaining.filter((occurrence) => staleIds.includes(occurrence.id))).toEqual([]);
	});

	it('reconciles a changed attempts ceiling on an unchanged cadence', async () => {
		await provision();
		const inserted = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(inserted.maxAttempts).toBe(3);

		const summary = await provision({ maxAttempts: 1 });

		expect(summary.unchanged).toEqual([{ id: inserted.id, name: JOB_NAME }]);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.id).toBe(inserted.id);
		expect(row.maxAttempts).toBe(1);
		expect(row.intervalSeconds).toBe(60);
	});

	it('converges on one row when two mains provision the same task at once', async () => {
		await Promise.all([provision(), provision()]);

		expect(await jobRepo.countBy({ ownerId: TASK_NAME })).toBe(1);
	});

	it('refuses an owner type nothing declared', async () => {
		await expect(
			provisioner.provision({
				owner: { ownerType: 'not-declared', ownerId: TASK_NAME, ownerMemberId: null },
				taskType: JOB_NAME,
				payload: {},
				desired: [
					{
						name: JOB_NAME,
						schedule: { kind: 'interval', intervalSeconds: 60 },
						firstRunAt: new Date(),
					},
				],
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			}),
		).rejects.toThrow(UnregisteredOwnerTypeError);
		expect(await jobRepo.count()).toBe(0);
	});
});
