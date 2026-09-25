import { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy, ScheduledJobOwnerType } from '@n8n/constants';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SystemTask, SystemTaskSchedule } from '@n8n/decorators';
import { UnregisteredOwnerTypeError } from '@n8n/scheduler';
import { ErrorReporter } from 'n8n-core';
import { inc } from 'semver';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import {
	SystemTaskJobRegistrar,
	systemTaskProvisionRequest,
} from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';

import { selfOwned } from './shared/job-factory';

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
	let registrar: SystemTaskJobRegistrar;

	const task = (over: Partial<SystemTask> = {}): SystemTask => ({
		name: TASK_NAME,
		schedule: { kind: 'interval', intervalSeconds: 60 },
		effects: 'idempotent',
		placement: { scope: 'cluster', durable: true },
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
		registrar = Container.get(SystemTaskJobRegistrar);
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
			payload: { n8nVersion: N8N_VERSION },
			kind: 'interval',
			intervalSeconds: 60,
			maxAttempts: 3,
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds: 60,
			concurrencyLimit: 1,
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

	it.each([
		['permits overlap', null],
		['raises the ceiling', 4],
	])('stores the concurrency limit a task declares when it %s', async (_case, concurrencyLimit) => {
		await provision({ concurrencyLimit });

		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.concurrencyLimit).toBe(concurrencyLimit);
	});

	it('reconciles a changed concurrency limit on an unchanged cadence', async () => {
		await provision();
		const inserted = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(inserted.concurrencyLimit).toBe(1);

		const summary = await provision({ concurrencyLimit: null });

		expect(summary.unchanged).toEqual([{ id: inserted.id, name: JOB_NAME }]);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.id).toBe(inserted.id);
		expect(row.concurrencyLimit).toBeNull();
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

	it('restamps a row another version provisioned, keeping the row and its cadence', async () => {
		await provision();
		const inserted = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		await jobRepo.update({ id: inserted.id }, { payload: { n8nVersion: '0.0.1' } });

		const summary = await provision();

		expect(summary.unchanged).toEqual([{ id: inserted.id, name: JOB_NAME }]);
		const row = await jobRepo.findOneByOrFail({ name: JOB_NAME });
		expect(row.payload).toEqual({ n8nVersion: N8N_VERSION });
		expect(row.intervalSeconds).toBe(60);
	});

	const store = async (name: string, n8nVersion: string) =>
		await jobRepo.save(
			jobRepo.create({
				name: `system:${name}`,
				...selfOwned(name),
				taskType: `system:${name}`,
				payload: { n8nVersion },
				kind: 'interval',
				intervalSeconds: 60,
				nextRunAt: new Date(),
			}),
		);

	it('lists a stored task as stale unless provisioned here or stamped by a newer version', async () => {
		const booting = new SystemTaskScheduledJobOwner(jobRepo);
		booting.declareDurable(TASK_NAME);
		const bootingRegistrar = new SystemTaskJobRegistrar(
			Container.get(Logger),
			jobRepo,
			provisioner,
			booting,
			Container.get(GlobalConfig),
			Container.get(ErrorReporter),
			Container.get(EventService),
		);
		await provisioner.provision(systemTaskProvisionRequest(task(), booting, 'UTC', new Date()));
		await store('from-a-newer-version', inc(N8N_VERSION, 'minor') as string);
		const older = await store('from-an-older-version', '0.0.1');

		await expect(bootingRegistrar.findStale()).resolves.toEqual([
			{ id: older.id, ownerId: 'from-an-older-version', payload: { n8nVersion: '0.0.1' } },
		]);
	});

	it('removes a stale job as it was listed, with its occurrences', async () => {
		const stale = await store('gone', '0.0.1');
		const now = new Date();
		await taskRepo.save(
			taskRepo.create({
				jobId: stale.id,
				taskType: 'system:gone',
				payload: {},
				scheduledFor: now,
				runAt: now,
				status: 'pending',
			}),
		);
		const [listed] = await registrar.findStale();

		await expect(provisioner.deprovisionUnchangedJob(listed)).resolves.toEqual({ removed: 1 });

		expect(await jobRepo.countBy({ id: stale.id })).toBe(0);
		expect(await taskRepo.countBy({ jobId: stale.id })).toBe(0);
	});

	it('keeps a listed job another version restamped before the delete ran', async () => {
		const stale = await store('taken-over', '0.0.1');
		const [listed] = await registrar.findStale();
		const newer = inc(N8N_VERSION, 'minor') as string;
		await jobRepo.update({ id: stale.id }, { payload: { n8nVersion: newer } });

		await expect(provisioner.deprovisionUnchangedJob(listed)).resolves.toEqual({ removed: 0 });

		const row = await jobRepo.findOneByOrFail({ id: stale.id });
		expect(row.payload).toEqual({ n8nVersion: newer });
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
