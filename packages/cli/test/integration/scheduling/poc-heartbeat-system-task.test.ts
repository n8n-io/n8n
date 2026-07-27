import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import {
	POC_HEARTBEAT_TASK_TYPE,
	PocHeartbeatTaskHandler,
} from '@/scheduling/system-tasks/poc-heartbeat-task-handler';

import { retryUntil } from '../shared/retry-until';

/**
 * PoC for the system-tasks migration design: proves a job with no owning
 * workflow can be provisioned through the generalised
 * `DurableJobProvisioner.provisionSystemJob`, materialized, claimed, and
 * dispatched by the real engine, the same way the schedule-trigger node's
 * workflow-scoped jobs already are (see `scheduler-trigger-handler.test.ts`
 * for that path). See
 * `notes/builder/durable-scheduler/distributed-scheduler-system-tasks-batch1-spec.md`.
 */
describe('system job with no owning workflow, provisioned and run end to end', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let provisioner: DurableJobProvisioner;
	let handler: PocHeartbeatTaskHandler;
	let scheduler: Scheduler & SchedulerPasses;

	beforeAll(async () => {
		await testDb.init();

		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		provisioner = Container.get(DurableJobProvisioner);
		handler = Container.get(PocHeartbeatTaskHandler);

		scheduler = createScheduler({
			hostId: 'main-poc-system-task',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
		});
		scheduler.registerTaskHandler(POC_HEARTBEAT_TASK_TYPE, handler);
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	it('provisions a system job by taskType, no workflowId/nodeId, and runs it', async () => {
		const firstRunAt = new Date(Date.now() - 1000);

		const summary = await provisioner.provisionSystemJob(POC_HEARTBEAT_TASK_TYPE, {}, [
			{
				name: POC_HEARTBEAT_TASK_TYPE,
				schedule: { kind: 'interval', intervalSeconds: 30 },
				firstRunAt,
			},
		]);

		expect(summary.inserted).toHaveLength(1);
		const jobId = summary.inserted[0].id;

		const row = await jobRepo.findOneByOrFail({ id: jobId });
		expect(row.workflowId).toBeNull();
		expect(row.nodeId).toBeNull();
		expect(row.taskType).toBe(POC_HEARTBEAT_TASK_TYPE);

		const fireCountBefore = handler.getFireCount();

		await scheduler.materialize();
		await scheduler.execute();

		await retryUntil(
			async () => {
				const task = await taskRepo.findOneByOrFail({ jobId });
				expect(task.status).toBe('succeeded');
			},
			{ timeoutMs: 15_000 },
		);

		expect(handler.getFireCount()).toBeGreaterThan(fireCountBefore);
	}, 30_000);

	it('re-provisioning with the same definition leaves the job unchanged', async () => {
		// Self-contained (doesn't depend on the previous test's row): truncate
		// first so this test's own first call is a genuine insert.
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);

		const desired = [
			{
				name: POC_HEARTBEAT_TASK_TYPE,
				schedule: { kind: 'interval' as const, intervalSeconds: 30 },
				firstRunAt: new Date(Date.now() - 1000),
			},
		];

		const first = await provisioner.provisionSystemJob(POC_HEARTBEAT_TASK_TYPE, {}, desired);
		expect(first.inserted).toHaveLength(1);
		const jobId = first.inserted[0].id;

		const second = await provisioner.provisionSystemJob(POC_HEARTBEAT_TASK_TYPE, {}, desired);

		expect(second.unchanged).toEqual([{ id: jobId, name: POC_HEARTBEAT_TASK_TYPE }]);
		expect(second.inserted).toEqual([]);
		expect(second.redefined).toEqual([]);
	});
});
