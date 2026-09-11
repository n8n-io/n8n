import { testDb } from '@n8n/backend-test-utils';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ReconciliationHooks, ScheduledJobOwnerRegistry } from '@n8n/scheduler';
import { reconcile } from '@n8n/scheduler';
import { inc } from 'semver';

import { N8N_VERSION } from '@/constants';
import { createScheduledJobOwnerRegistry } from '@/scheduling/scheduled-job-owner-registry';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { createDueJobFactory, seedDueTask } from './shared/job-factory';

/**
 * What the sweep does to system task jobs, through the production registry.
 */
describe('system task reconciliation', () => {
	const TASK_TYPE = 'system:integration-reconciliation';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let owner: SystemTaskScheduledJobOwner;
	let registry: ScheduledJobOwnerRegistry;
	let config: SchedulerConfig;
	let createJob: ReturnType<typeof createDueJobFactory>;

	/** Backdate a job past the settle window so the sweep considers it. */
	const settle = async (jobId: number) => {
		await jobRepo.update(
			{ id: jobId },
			{ createdAt: new Date(Date.now() - (config.ownerSettleSeconds + 60) * 1000) },
		);
	};

	const runReconciliation = async (hooks: ReconciliationHooks = {}) =>
		await reconcile(
			jobRepo,
			registry,
			async () => await taskRepo.readDbTime(),
			{
				settleSeconds: config.ownerSettleSeconds,
				quarantineGraceSeconds: config.ownerQuarantineGraceSeconds,
				batchSize: config.ownerReconciliationBatchSize,
				maxPagesPerPass: 1000,
				defaultTimezone: 'UTC',
			},
			hooks,
		);

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		config = Container.get(SchedulerConfig);
		createJob = createDueJobFactory(jobRepo, TASK_TYPE, 'system:reconciliation');
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		owner = new SystemTaskScheduledJobOwner(jobRepo);
		registry = createScheduledJobOwnerRegistry(Container.get(WorkflowScheduledJobOwner), owner);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('quarantines a settled job no task declares and withdraws its queued occurrence', async () => {
		const job = await createJob();
		const queued = await seedDueTask(taskRepo, TASK_TYPE, job.id);
		await settle(job.id);

		const summary = await runReconciliation();

		expect(summary).toMatchObject({ quarantined: 1, deleted: 0, ownersChecked: 1 });
		const stopped = await jobRepo.findOneBy({ id: job.id });
		expect(stopped?.orphanedAt).not.toBeNull();
		expect(stopped?.nextRunAt).toBeNull();
		expect(await taskRepo.findOneBy({ id: queued.id })).toBeNull();
	});

	it('leaves a settled job running while this instance runs its task durably', async () => {
		const job = await createJob();
		const queued = await seedDueTask(taskRepo, TASK_TYPE, job.id);
		await settle(job.id);
		owner.declareDurable(job.ownerId);

		const summary = await runReconciliation();

		expect(summary).toMatchObject({ quarantined: 0, deleted: 0, ownersChecked: 1 });
		const still = await jobRepo.findOneBy({ id: job.id });
		expect(still?.orphanedAt).toBeNull();
		expect(still?.nextRunAt).not.toBeNull();
		expect(await taskRepo.findOneBy({ id: queued.id })).not.toBeNull();
	});

	it('leaves a settled job running while a newer version stamped it', async () => {
		const job = await createJob({ payload: { n8nVersion: inc(N8N_VERSION, 'minor') } });
		await settle(job.id);

		const summary = await runReconciliation();

		expect(summary).toMatchObject({ quarantined: 0, deleted: 0, ownersChecked: 1 });
		const still = await jobRepo.findOneBy({ id: job.id });
		expect(still?.orphanedAt).toBeNull();
		expect(still?.nextRunAt).not.toBeNull();
	});

	it('revives a quarantined job once this instance runs its task durably again', async () => {
		const job = await createJob();
		await settle(job.id);
		await runReconciliation();
		owner.declareDurable(job.ownerId);

		const summary = await runReconciliation();

		expect(summary).toMatchObject({ quarantined: 0, deleted: 0, revived: 1 });
		const revived = await jobRepo.findOneBy({ id: job.id });
		expect(revived?.orphanedAt).toBeNull();
		expect(revived?.nextRunAt).not.toBeNull();
	});

	it('drains the owner type without reporting a resolver failure', async () => {
		const job = await createJob();
		await settle(job.id);
		const onResolverFailed = vi.fn();

		const summary = await runReconciliation({ onResolverFailed });

		expect(summary.skippedOwnerTypes).toEqual([]);
		expect(summary.drained).toBe(true);
		expect(onResolverFailed).not.toHaveBeenCalled();
	});
});
