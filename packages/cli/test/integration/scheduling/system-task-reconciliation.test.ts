import { testDb } from '@n8n/backend-test-utils';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ReconciliationHooks, ScheduledJobOwnerRegistry } from '@n8n/scheduler';
import { reconcile } from '@n8n/scheduler';

import { createScheduledJobOwnerRegistry } from '@/scheduling/scheduled-job-owner-registry';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { createDueJobFactory, seedDueTask } from './shared/job-factory';

/**
 * What the sweep does to system task jobs, through the production registry.
 *
 * `SystemTaskScheduledJobOwner.findExisting` reports every task as existing,
 * so the sweep retires nothing. CAT-4158 will replace that resolver, and this
 * suite is what has to change with it.
 */
describe('system task reconciliation', () => {
	const TASK_TYPE = 'system:integration-reconciliation';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
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
		registry = createScheduledJobOwnerRegistry(
			Container.get(WorkflowScheduledJobOwner),
			Container.get(SystemTaskScheduledJobOwner),
		);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('leaves a settled system task job running even though no task declares it', async () => {
		const job = await createJob();
		const queued = await seedDueTask(taskRepo, TASK_TYPE, job.id);
		await settle(job.id);

		const summary = await runReconciliation();

		expect(summary).toMatchObject({ quarantined: 0, deleted: 0, ownersChecked: 1 });
		const still = await jobRepo.findOneBy({ id: job.id });
		expect(still).toMatchObject({ enabled: true, orphanedAt: null });
		expect(still?.nextRunAt).not.toBeNull();
		expect(await taskRepo.findOneBy({ id: queued.id })).not.toBeNull();
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
